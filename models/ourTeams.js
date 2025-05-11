
const mongoose = require("mongoose");

const ourTeamMemberSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true
    },
    photo: {
        type: String, // This will store the file path or URL
        required: true
    },
     // other fields
  dailyPicks: [{
    date: { type: Date, default: Date.now },
    count: { type: Number, default: 0 }
  }]
}, { timestamps: true });

const ourTeams = mongoose.model("ourTeams", ourTeamMemberSchema);
module.exports = ourTeams;
