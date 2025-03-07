const mongoose = require('mongoose');
const moment = require('moment');

const donationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    longitude: {
        type: Number,
        required: true,
    },
    latitude: {
        type: Number,
        required: true,
    },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    foodRequest: { type: mongoose.Schema.Types.ObjectId, ref: "FoodRequest" },


    donatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    claimedToken: String,
    photos: {
        type: [String], // Array of image URLs (optional)
    },
    message: String,
    subject: String,
    expiryTime: {
        type: Date,
        required: true,  // The donor provides expiry time in hours
    },
    status: {
        type: String,
        enum: ['claim', 'claimed'],  // 'claim' means it is available, 'claimed' means claimed
        default: 'claim',  // Initially set to 'claim'
    },
    // Reference to the User who made the donation
    user: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',  // Reference to the 'Donation' model
        required: false,  // Donations are optional on user creation
    }],
    donationDate: { type: Date, default: Date.now },
});

// Set the expiry time based on the user input
donationSchema.pre('save', function (next) {
    if (this.expiryTime) {
        // Set expiryTime as current time + user-selected hours
        this.expiryDate = moment().add(this.expiryTime, 'hours').toDate();
    }
    next();
});

const Donation = mongoose.model('Donation', donationSchema);
module.exports = Donation;


