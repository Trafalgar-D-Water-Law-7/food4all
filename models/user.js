const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true // Ensure unique email
    },
    password: {
        type: String,
        required: true
    },
    feedback: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Testimonial' }],
    street: {
        type: String,
        required: true
    },
    contact: {
        type: String,
        required: true
    },
    photo: {
        type: String, // File path of uploaded photo
    },
    donationCount: {
        type: Number,
        default: 0 // Initialize with 0 donations
    },
    donations: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Donation',  // Reference to the 'Donation' model
        required: false,  // Donations are optional on user creation
    }],
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = User;
