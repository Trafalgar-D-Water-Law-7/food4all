const express = require('express');
const moment = require('moment');
const router = express.Router();
const ensureAuthenticated = require("../config/ensureAuthenticated")
const User = require("../models/user")
const SuccessRequestDonation = require("../models/successRequestDonation")
const FoodRequest = require("../models/request")
const transporter = require('../config/mailer');



router.get("/", ensureAuthenticated, async (req, res) => {
    const userId = req.session.userId;
    const user = await User.findById(userId)
    if (!req.session.userId) {
        req.flash("error", "You must be logged in to request food.");
        return res.redirect("/users/login");
    }
    // Pass user details to the form
    res.render("request", {
        user,
        success: req.flash('success'),
        error: req.flash('error')
    });
});

// Handle food request submission
router.post("/submit-food-request", ensureAuthenticated, async (req, res) => {
    try {
        const { message, address, latitude, longitude } = req.body;
        const userId = req.session.userId;
        console.log(userId)

        if (!userId) {
            req.flash("error", "Please log in to submit a food request.");
            return res.redirect("/users/login");
        }

        if (!message || !address) {
            req.flash("error", "Message and address are required.");
            return res.redirect("/request");
        }

        const wordCount = message.trim().split(/\s+/).length;
        if (wordCount < 5) {
            req.flash("error", "Message must be at least 5 words.");
            return res.redirect("/request");
        }

        // ✅ Check how many requests today
        const startOfDay = moment().startOf('day').toDate();
        const endOfDay = moment().endOf('day').toDate();

        const todayCount = await FoodRequest.countDocuments({
            user: userId,
            createdAt: { $gte: startOfDay, $lte: endOfDay }
        });

        if (todayCount >= 3) {
            req.flash("error", "You can only submit 3 food requests per day.");
            return res.redirect("/request");
        }

        // ✅ Proceed with saving new request
        const newRequest = new FoodRequest({
            user: userId,
            message,
            address,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
        });

        await newRequest.save();

        req.flash("success", "Food request submitted successfully!");
        return res.redirect("/request/requestedForFood");

    } catch (error) {
        console.error("Error submitting food request:", error);
        req.flash("error", "An error occurred. Please try again.");
        return res.redirect("back");
    }
});



router.get("/requestedForFood", async (req, res) => {
    try {
        let filter = {};

        if (req.session.userId) {
            // Exclude the logged-in user's requests
            filter = { user: { $ne: req.session.userId } };
        }

        const requests = await FoodRequest.find(filter).populate('user');

        res.render("requestedForFood", {
            requests,
            success: req.flash('success'),
            error: req.flash('error'),
            session: req.session
        });

    } catch (error) {
        console.error(error);
        req.flash('error', 'Something went wrong, please try again.');
        res.redirect('/');
    }
});

router.post("/i-want-to-donate", ensureAuthenticated, async (req, res) => {
    const { requestId, message, address, latitude, longitude } = req.body;
    const donorId = req.session.userId;
    const fallbackRedirect = req.get("Referer") || "/request";

    try {
        // Validate input
        if (!requestId || !message || !address) {
            req.flash("error", "All fields are required.");
            return res.redirect(fallbackRedirect);
        }

        if (message.trim().split(/\s+/).length < 5) {
            req.flash("error", "Message must be at least 5 words.");
            return res.redirect(fallbackRedirect);
        }

        if (address.trim().split(/\s+/).length < 2) {
            req.flash("error", "Address must be at least 2 words.");
            return res.redirect(fallbackRedirect);
        }

        // Parallel DB queries
        const [donor, foodRequest] = await Promise.all([
            User.findById(donorId),
            FoodRequest.findById(requestId).populate("user")
        ]);

        if (!donor || !foodRequest) {
            req.flash("error", "Invalid request.");
            return res.redirect(fallbackRedirect);
        }

        // 🛑 Cannot donate to your own request
        if (foodRequest.user._id.toString() === donorId.toString()) {
            req.flash("error", "You cannot donate to your own request.");
            return res.redirect(fallbackRedirect);
        }

        // 🛑 Already donated to this request
        if (foodRequest.wantToDonate.includes(donorId)) {
            req.flash("error", "You have already offered to donate for this request.");
            return res.redirect(fallbackRedirect);
        }

        // 🛑 Request already has 5 donors
        if (foodRequest.wantToDonate.length >= 5) {
            req.flash("error", "This request has already reached the maximum donation limit.");
            return res.redirect(fallbackRedirect);
        }

        // 🛑 Daily donation limit check (3 per day)
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const todaysDonations = await SuccessRequestDonation.countDocuments({
            donor: donorId,
            createdAt: { $gte: startOfDay, $lte: endOfDay }
        });

        if (todaysDonations >= 3) {
            req.flash("error", "You’ve reached your daily donation limit (3 per day).");
            return res.redirect(fallbackRedirect);
        }

        // ✅ Add donor to the request
        foodRequest.wantToDonate.push(donorId);
        await foodRequest.save();

        // ✅ Save donation record
        const successDonation = new SuccessRequestDonation({
            donor,
            recipient: foodRequest.user._id,
            foodRequest: requestId,
            message,
            address,
            latitude: latitude ? parseFloat(latitude) : undefined,
            longitude: longitude ? parseFloat(longitude) : undefined
        });

        await successDonation.save();

        req.flash("success", "Donation submitted! Recipient notified.");
        res.redirect(fallbackRedirect);

        // ✅ Send email (non-blocking)
        setImmediate(async () => {
            try {
                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: foodRequest.user.email,
                    subject: "🎉 Someone Wants to Donate Food to You!",
                    html: `
                        <h2>Hello ${foodRequest.user.name},</h2>
                        <p><strong>${donor.name}</strong> has offered to donate food to you!</p>
                        <ul>
                            <li><strong>Message:</strong> ${message}</li>
                            <li><strong>Phone:</strong> <a href="tel:${donor.contact}">${donor.contact}</a></li>
                            <li><strong>Location:</strong> <a href="https://www.google.com/maps?q=${latitude},${longitude}" target="_blank">View on Google Maps</a></li>
                        </ul>
                        <p>Please log into your account to accept or decline the donation.</p>
                        <br>
                        <p>Best regards,<br><strong>Plate Share Team</strong></p>
                    `
                });
            } catch (emailErr) {
                console.error("Email sending failed:", emailErr);
            }
        });

    } catch (err) {
        console.error("Error in donation submission:", err);
        req.flash("error", "Something went wrong. Please try again.");
        res.redirect(fallbackRedirect);
    }
});





// DELETE /request/:id
router.delete('/delete/:id', async (req, res) => {
    try {
        const requestId = req.params.id;

        // Find the request
        const request = await FoodRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        // Delete the request
        await FoodRequest.findByIdAndDelete(requestId);

        res.status(200).json({ message: 'Request deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});




module.exports = router