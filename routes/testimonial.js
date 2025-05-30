const express = require("express");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const flash = require("connect-flash");
const User = require("../models/user");
const router = express.Router();

const testimonial = require("../models/testimonial")


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
        let feedback = await testimonial.findOne({ user: userId });

        if (feedback) {
            // Update existing feedback
            feedback.message = message;
            await feedback.save();
        } else {
            // Create a new feedback
            feedback = new testimonial({
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
        const feedbacks = await testimonial.find().populate('user'); // Populating username only

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



// DELETE testimonial by ID
router.delete('/:id', async (req, res) => {
  try {
    const feedback = await testimonial.findById(req.params.id);

    if (!feedback) {
      req.flash('error', 'Testimonial not found');
      return res.redirect('/');
    }

    // Ensure the logged-in user is the one who posted it
    if (feedback.user.toString() !== req.session.userId.toString()) {
      req.flash('error', 'You are not authorized to delete this testimonial');
      return res.redirect('/');
    }

    await testimonial.findByIdAndDelete(req.params.id);

    req.flash('success', 'Testimonial deleted successfully');
    res.redirect('/');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Something went wrong');
    res.redirect('/');
  }
});





module.exports = router;
