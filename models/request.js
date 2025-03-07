const mongoose = require("mongoose");

const FoodRequestSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    foodType: { type: String, required: true },
    message: { type: String, required: true },
    quantity: { type: Number, required: true },
    deliveryOption: { type: String, enum: ["pickup", "delivery"], required: true },
    longitude: {
        type: Number
    },
    latitude: {
        type: Number,
    },
    address: {
        type: String,
        required: true
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("FoodRequest", FoodRequestSchema);
