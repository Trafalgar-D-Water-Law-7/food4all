const express = require("express");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const flash = require("connect-flash");
const User = require("../models/user");
const router = express.Router();

const testamonial = require("../models/testimonial")


// Assuming userId is stored in the session after login
router.post("/", async (req, res) => {
    const userId = req.session.userId;

    if (!userId) {
        req.flash("error", "You must be logged in to submit feedback.");
        return res.redirect("/users/login");
    }

    const { message } = req.body;

    function countWords(str) {
        return str.trim().split(/\s+/).length;
    }

    const wordCount = countWords(message);
    if (wordCount < 5) {
        req.flash("error", "Your feedback must be at least 5 words.");
        return res.redirect(req.originalUrl);
    }

    if (wordCount > 50) {
        req.flash("error", "Your feedback must be no more than 50 words.");
        return res.redirect(req.originalUrl);
    }

    try {
        // Check if feedback already exists for this user
        let feedback = await testamonial.findOne({ user: userId });

        if (feedback) {
            // Update existing feedback
            feedback.message = message;
            await feedback.save();
        } else {
            // Create a new feedback
            feedback = new testamonial({
                user: userId,
                message: message
            });
            await feedback.save();
        }

        // Optionally update the user's feedback reference (if needed)
        const user = await User.findById(userId);
        if (user) {
            user.feedback = [feedback._id]; // Replace or set to this feedback
            await user.save();
        }

        req.flash("success", "Feedback submitted successfully!");
        res.redirect(req.originalUrl);
    } catch (error) {
        console.error(error);
        req.flash("error", "Failed to submit feedback. Please try again later.");
        res.redirect(req.originalUrl);
    }
});




router.get('/', async function (req, res, next) {
    try {
        // Fetch all feedback and populate the user details
        const feedbacks = await testamonial.find().populate('user'); // Populating username only

        res.render('testimonial', {
            title: 'Express',
            success: req.flash('success'),
            error: req.flash('error'),
            feedbacks: feedbacks // Pass the feedbacks data to the template
        });
    } catch (error) {
        console.error(error);
        req.flash('error', 'Failed to load feedback');
        res.redirect('back'); // Redirect back on error
    }
});






module.exports = router;
