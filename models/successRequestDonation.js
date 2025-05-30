const mongoose = require("mongoose");

const SuccessRequestDonationSchema = new mongoose.Schema({
    donor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
     
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
       
    },
    foodRequest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FoodRequest",
        required: true
    },
    pickedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ourTeams"
    },
    message: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    longitude: {
        type: Number
    },
    latitude: {
        type: Number
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// ✅ Safe model definition
const SuccessRequestDonation = mongoose.models.SuccessRequestDonation || mongoose.model("SuccessRequestDonation", SuccessRequestDonationSchema);

module.exports = SuccessRequestDonation;
