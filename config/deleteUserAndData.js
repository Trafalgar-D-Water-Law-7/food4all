const User = require("../models/user");
const Donation = require("../models/donation");
const Feedback = require("../models/testimonial");
const Request = require("../models/request");
// Add any other related models here

async function deleteUserAndData(userId) {
  if (!userId) throw new Error("User ID is required");

  // Find user first
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // Delete all related data by user id
  await Donation.deleteMany({ userId: user._id });
  await Feedback.deleteMany({ userId: user._id });
  await Request.deleteMany({ userId: user._id });
  // Add any other deletions as needed

  // Delete the user last
  await User.findByIdAndDelete(user._id);
}

module.exports = deleteUserAndData;
