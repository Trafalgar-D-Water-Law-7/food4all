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
// Handle food request submission
router.post("/submit-food-request", ensureAuthenticated, async (req, res) => {
    try {
        const { message, address, latitude, longitude } = req.body;
        const userId = req.session.userId;

        if (!userId) {
            req.flash("error", "Please log in to submit a food request.");
            return res.redirect("/users/login");
        }

        if (!message || !address) {
            req.flash("error", "Message and address are required.");
            return res.redirect("back");
        }

        const wordCount = message.trim().split(/\s+/).length;
        if (wordCount < 5) {
            req.flash("error", "Message must be at least 5 words.");
            return res.redirect("back");
        }

        // ❗ Check if the user already has a previous request
        const previousRequest = await FoodRequest.findOne({ user: userId });

        if (previousRequest) {
            await FoodRequest.deleteOne({ _id: previousRequest._id });
            req.flash("warning", "Your previous food request was removed to submit a new one.");
        }

        const newRequest = new FoodRequest({
            user: userId,
            message,
            address,
            latitude: latitude ? parseFloat(latitude) : undefined,
            longitude: longitude ? parseFloat(longitude) : undefined,
        });

        await newRequest.save();

        req.flash("success", "Food request submitted successfully!");
        res.redirect("/request/requestedForFood");

    } catch (error) {
        console.error("Error submitting food request:", error);
        req.flash("error", "An error occurred. Please try again.");
        res.redirect("back");
    }
});



router.get("/requestedForFood", async (req, res) => {
    try {
        const userLat = parseFloat(req.query.lat);
        const userLng = parseFloat(req.query.lng);

        const requests = await FoodRequest.find().populate('user');

        const enrichedRequests = requests.map(req => {
            const timeAgo = moment(req.createdAt).fromNow();
            let distanceKm = null;

            if (userLat && userLng && req.latitude && req.longitude) {
                const distanceMeters = haversine(
                    { lat: userLat, lng: userLng },
                    { lat: req.latitude, lng: req.longitude }
                );
                distanceKm = (distanceMeters / 1000).toFixed(1); // e.g., "2.3"
            }

            return {
                ...req.toObject(),
                timeAgo,
                distanceKm
            };
        });

        res.render("requestedForFood", {
            success: req.flash('success'),
            error: req.flash('error'),
            requests: enrichedRequests
        });
    } catch (error) {
        console.error(error);
        req.flash('error', 'Something went wrong, please try again.');
        res.redirect('/');
    }
});



router.post("/i-want-to-donate", ensureAuthenticated, async (req, res) => {
    const { requestId, message, address, latitude, longitude } = req.body;
    console.log("Donation Form Submission:", req.body);

    const donorId = req.session.userId;
    const fallbackRedirect = req.get("Referer") || "/request";

    try {
        // Validate basic fields
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

        // Run DB queries in parallel
        const [donor, foodRequest] = await Promise.all([
            User.findById(donorId),
            FoodRequest.findById(requestId).populate("user")
        ]);

        if (!donor || !foodRequest) {
            req.flash("error", "Invalid request.");
            return res.redirect(fallbackRedirect);
        }

        if (foodRequest.user._id.toString() === donorId.toString()) {
            req.flash("error", "You cannot donate to your own request.");
            return res.redirect(fallbackRedirect);
        }

        if (foodRequest.wantToDonate.includes(donorId)) {
            req.flash("error", "You have already offered to donate for this request.");
            return res.redirect(fallbackRedirect);
        }

        // Add donor to the request
        foodRequest.wantToDonate.push(donorId);
        await foodRequest.save();

        // Save success donation record
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

        // Respond immediately
        req.flash("success", "Donation submitted! Recipient notified.");
        res.redirect(fallbackRedirect);

        // Send email asynchronously (non-blocking)
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





router.delete("/:id", ensureAuthenticated, async (req, res) => {
    try {
        const requestId = req.params.id;
        const userId = req.session.userId;

        // Find the request
        const foodRequest = await FoodRequest.findById(requestId);
        if (!foodRequest) {
            req.flash("error", "Request not found.");
            return res.redirect("back");
        }

        // Ensure the logged-in user is the one who created the request
        if (foodRequest.user.toString() !== userId.toString()) {
            req.flash("error", "You are not authorized to delete this request.");
            return res.redirect("back");
        }

        // Delete the request
        await FoodRequest.findByIdAndDelete(requestId);

        req.flash("success", "Food request deleted successfully!");
        res.redirect("back"); // Redirect to the previous page
    } catch (error) {
        console.error("Error deleting request:", error);
        req.flash("error", "Something went wrong. Please try again.");
        res.redirect("back");
    }
});



module.exports = router