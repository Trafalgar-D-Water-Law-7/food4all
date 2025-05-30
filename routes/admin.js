const express = require("express");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const Admin = require("../models/Admin");
const User = require("../models/user");
const adminAuth = require("../config/adminAuth");
const members=require("../models/ourTeams");
const successRequestDonation = require("../models/successRequestDonation");



const router = express.Router();
const otpMap = new Map();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

// Protect dashboard and deletion
router.get("/", adminAuth, async (req, res) => {
  try {
    const membersList = await members.find().lean();
    const users = await User.find().lean();
    req.flash("success", "OTP sent to your email");     
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.render("adminDashboard", { users,membersList });
  } catch (err) {
    res.status(500).send("Failed to fetch users");
  }
});



// PATCH: Approve member
router.put('/approve-member/:id', async (req, res) => {
  try {
    const member = await members.findByIdAndUpdate(req.params.id, { isApproved: true });
    if (!member) return res.status(404).json({ message: "Member not found" });

    res.json({ message: "Member approved successfully" });
  } catch (err) {
    console.error("Approval error:", err);
    res.status(500).json({ message: "Server error" });
  }
});



// New route: Delete a member by ID
router.delete('/delete-member/:id', async (req, res) => {
  try {
    const memberId = req.params.id;

    // 1. Delete the member
    await members.findByIdAndDelete(memberId);

    // 2. Unassign this member from any picked donations
    await successRequestDonation.updateMany(
      { pickedBy: memberId },
      { $set: { pickedBy: null } }
    );

    res.status(200).send("Member deleted successfully and picked items reset.");
  } catch (err) {
    console.error("Error deleting member and resetting picks:", err);
    res.status(500).send("Failed to delete member.");
  }
});



router.delete("/delete-user/:id", adminAuth, async (req, res) => {
  try {
    const deletedUser = await User.findOneAndDelete({ _id: req.params.id });
    if (!deletedUser) return res.status(404).send("User not found");
    res.send("User and donations deleted");
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});






// Login/logout
router.get("/login", (req, res) => {
  res.render("adminLogin", { error: req.flash("error"), success: req.flash("success") });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email: email.toLowerCase() });
  if (!admin || !(await bcrypt.compare(password, admin.password))) {
    req.flash("error", "Invalid email or password");
    return res.redirect("/admin/login");
  }

  req.session.admin = { _id: admin._id, email: admin.email };
  req.flash("success", "Logged in successfully");
  res.redirect("/admin");
});

router.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/admin/login"));
});

module.exports = router;
