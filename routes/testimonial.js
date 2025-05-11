const express = require("express");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const flash = require("connect-flash");
const User = require("../models/user");
const router = express.Router();

const testamonial = require("../models/testimonial")


// Assuming userId is stored in the session after login

router.post("/", async (req, res) => {
    // Get the userId from the session
    const userId = req.session.userId; // Replace with the actual session property storing the user ID
  
    if (!userId) {
        // If user is not logged in, flash an error message and redirect to login page
        req.flash("error", "You must be logged in to submit feedback.");
        return res.redirect("/users/login"); // Redirect to login page (or wherever the login route is)
    }

    const { message } = req.body;

    // Function to count words in the feedback message
    function countWords(str) {
        return str.trim().split(/\s+/).length;
    }

    // Validate word count (between 5 and 20 words)
    const wordCount = countWords(message);
    if (wordCount < 5) {
        req.flash("error", "Your feedback must be at least 5 words.");
        return res.redirect(req.originalUrl);
        // Redirect back to the same page
    }

    if (wordCount > 20) {
        req.flash("error", "Your feedback must be no more than 20 words.");
        return res.redirect(req.originalUrl);
        // Redirect back to the same page
    }

    try {
        // Create a new feedback document
        const feedback = new testamonial({
            user: userId, // Use the userId from the session
            message: message
        });

        // Save the feedback
        await feedback.save();

        // Update the User schema and add the feedback ID to the user's feedback array
        const user = await User.findById(userId);
        if (user) {
            user.feedback.push(feedback._id); // Push the feedback ID to the user's feedback array
            await user.save(); // Save the updated user document
        } else {
            req.flash("error", "User not found.");
            return res.redirect(req.originalUrl);

        }

        // Send a success message
        req.flash("success", "Feedback submitted successfully!");
        res.redirect(req.originalUrl);// Redirect back to the same page
    } catch (error) {
        console.error(error);
        // If an error occurs, show an error message
        req.flash("error", "Failed to submit feedback. Please try again later.");
        res.redirect(req.originalUrl);// Redirect back to the same page
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
