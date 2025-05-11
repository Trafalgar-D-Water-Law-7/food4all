const mongoose = require("mongoose");

const FoodRequestSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true },
    longitude: { type: Number },
    latitude: { type: Number },
    address: { type: String, required: true },

    wantToDonate: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }]
}, {
    timestamps: true  // ✅ Automatically adds createdAt and updatedAt
});


module.exports = mongoose.model("FoodRequest", FoodRequestSchema);
