const mongoose = require("mongoose");

const SuccessRequestDonation = new mongoose.Schema({
    donor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Reference to the donor (who is donating the food)
        required: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // Reference to the recipient (who requested the food)
        required: true
    },
    foodRequest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FoodRequest", // Reference to the food request
        required: true
    },
    pickedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ourTeams" // or your member model
    }
    ,
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
        type: Number,
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("SuccessRequestDonation", SuccessRequestDonation);
