const mongoose = require("mongoose");

// Admin Schema
const adminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true, // Ensures no duplicate usernames
        trim: true, // Trims whitespace from both ends
    },
    password: {
        type: String,
        required: true,
    },
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

// Create the Admin model based on the schema
const Admin = mongoose.model("Admin", adminSchema);

module.exports = Admin;
