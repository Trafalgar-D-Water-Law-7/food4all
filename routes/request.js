const express = require('express');
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
        const userId = req.session.userId; // Get logged-in user ID
        if (!userId) {
            req.flash("error", "You must be logged in to request food.");
            return res.redirect("/users/login"); // Redirect to login if not logged in
        }
        const { foodType, message, quantity, deliveryOption, latitude, longitude, address } = req.body;
        // Validate message length
        const wordCount = message.trim().split(/\s+/).length;
        if (wordCount < 5) {
            req.flash("error", "Request for food  must be at least 5 words.");
            return res.redirect("back"); // Redirect back with error
        }


        // Validate required fields
        if (!foodType || !quantity || !deliveryOption) {
            req.flash("error", "All fields must be filled.");
            return res.redirect("back");
        }

        // Create and save the food request
        const newRequest = new FoodRequest({
            user: userId,
            foodType,
            message,
            quantity,
            address,
            deliveryOption,
            latitude: latitude ? parseFloat(latitude) : undefined,
            longitude: longitude ? parseFloat(longitude) : undefined
        });

        await newRequest.save(); // Save to database

        req.flash("success", "Your food request has been submitted successfully!");
        res.redirect("back"); // Redirect back to the same page
    } catch (error) {
        console.error(error);
        req.flash("error", "Something went wrong. Please try again.");
        res.redirect("back");
    }
});

router.get("/requestedForFood", async (req, res) => {
    try {
        // Fetching food requests and populating the associated user details
        const requests = await FoodRequest.find().populate('user'); // 'user' is the field in FoodRequest model referring to User



        res.render("requestedForFood", {
            success: req.flash('success'),
            error: req.flash('error'),
            requests
        });
    } catch (error) {
        console.error(error);
        req.flash('error', 'Something went wrong, ple   ase try again.');
        res.redirect('/');
    }
});



// Handle donation submission
router.post("/i-want-to-donate", ensureAuthenticated, async (req, res) => {
    try {
        const { requestId, message, address, latitude, longitude } = req.body;

        const donorId = req.session.userId; // Logged-in user donating
        const donor = await User.findById(donorId);
        // Validation: Ensure all fields are filled
        if (!requestId || !address || !message) {
            req.flash("error", "All fields are required, and quantity must be positive.");
            return res.redirect("back");
        }

        const wordCount = message.trim().split(/\s+/).length;
        if (wordCount < 5) {
            req.flash("error", "  must be at least 5 words.");
            return res.redirect("back"); // Redirect back with error
        }

        const addressWordCount = address.trim().split(/\s+/).length;
        if (addressWordCount < 5) {
            req.flash("error", "  must be at least 2 words.");
            return res.redirect("back"); // Redirect back with error
        }

        // Find the food request and populate requester details
        const foodRequest = await FoodRequest.findById(requestId).populate("user");
        if (!foodRequest) {
            req.flash("error", "Food request not found.");
            return res.redirect("back");
        }

        // Ensure donor is not the same as the requester
        if (foodRequest.user._id.toString() === donorId.toString()) {
            req.flash("error", "You cannot donate to your own request.");
            return res.redirect("back");
        }

        // Create a new donation record
        const successRequestDonation = new SuccessRequestDonation({
            donor,
            recipient: foodRequest.user._id,
            foodRequest: requestId,
            message,
            address,
            latitude: latitude ? parseFloat(latitude) : undefined,
            longitude: longitude ? parseFloat(longitude) : undefined
        });


        await successRequestDonation.save();

        // Send an email to the recipient
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: foodRequest.user.email, // Recipient's email
            subject: "🎉 Someone Wants to Donate Food to You!",
            html: `
        <h2>Hello ${foodRequest.user.name},</h2>
        <p>Great news! <strong>${donor.name}</strong> has offered to donate food to you.</p>
        <h3>Donation Details:</h3>
        <ul>
            <li>
            <strong>Message from ${donor.name}:</strong> ${message}</li>
            <li>
            <strong>Phone Number:</strong> 
                <a href="tel:${donor.contact}" style="color: blue; text-decoration: none;">
                    ${donor.contact}
                </a>
            </li>
             <li>
            <strong>Message from ${donor.name}:</strong> ${message}</li>
            <li>
        <li>
            <strong>Donation Location:</strong>
            <a href="https://www.google.com/maps?q=${req.body.latitude},${req.body.longitude}" target="_blank" style="color: blue; text-decoration: none;">
                View on Google Maps
            </a>
        </li>
        </ul>
        <p>Please log in to your account to accept or decline the donation.</p>
        <br>
        <p>Best regards,<br><strong>Your Food Donation Platform</strong></p>
    `,
        };


        await transporter.sendMail(mailOptions);

        req.flash("success", "Donation request submitted successfully! The recipient has been notified.");
        res.redirect("back");
    } catch (error) {
        console.error(error);
        req.flash("error", "Something went wrong. Please try again.");
        res.redirect("back");
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