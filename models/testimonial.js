const mongoose = require('mongoose');

// Define the Testimonial schema
const feedbackSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to the User model
        required: true // Ensures that every feedback must be associated with a user
    },
    message: {
        type: String,
        required: true, // Ensures that feedback message is provided
        minlength: 5, // Minimum length of the feedback message
        maxlength: 500 // Maximum length of the feedback message
    },
    createdAt: {
        type: Date,
        default: Date.now // Automatically sets the creation date to the current time
    }
});

// Create and export the Testimonial model based on the schema
const Testimonial = mongoose.model('Testimonial', feedbackSchema);

module.exports = Testimonial;
