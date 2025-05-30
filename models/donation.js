const mongoose = require('mongoose');
const moment = require('moment');

const donationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    longitude: { type: Number, required: true },
    latitude: { type: Number, required: true },
    city: { type: String, default: 'Unknown' },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    foodRequest: { type: mongoose.Schema.Types.ObjectId, ref: "FoodRequest" },
    donatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    claimedToken: String,
    photos: { type: [String] },
    message: String,
    subject: String,
    expiryTime: { type: Date, required: true },
    status: { type: String, enum: ['claim', 'claimed'], default: 'claim' },
    user: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }],
    donationDate: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// This pre hook is logically wrong — expiryTime is already a Date.
// You're trying to treat expiryTime as "number of hours", which is incorrect.
donationSchema.pre('save', function (next) {
    // ❌ this.expiryTime is already a Date; no need to convert again
    next();
});

// ✅ Prevent OverwriteModelError
const Donation = mongoose.models.Donation || mongoose.model('Donation', donationSchema);
module.exports = Donation;
