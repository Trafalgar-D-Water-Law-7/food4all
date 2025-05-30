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


// Registration flow
router.get("/create", (req, res) => res.render("create"));


router.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  const existing = await Admin.findOne({ email: email.toLowerCase() });
  if (existing) {
    req.flash("error", "Admin already exists");
    return res.redirect("/admin/create");
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpMap.set(email, otp);

  await transporter.sendMail({
    from: process.env.EMAIL,
    to: email,
    subject: "Admin OTP Verification",
    text: `Your OTP is: ${otp}`,
  });

  req.session.pendingAdminEmail = email;
  req.flash("success", "OTP sent to your email");
  res.redirect("/admin/verify-otp");
});

router.get("/verify-otp", (req, res) => {
  if (!req.session.pendingAdminEmail) {
    req.flash("error", "Start registration again");
    return res.redirect("/admin/create");
  }
  res.render("verify");
});

router.post("/verify-otp", (req, res) => {
  const { otp, password } = req.body;
  const email = req.session.pendingAdminEmail;

  if (otpMap.get(email) !== otp) {
    req.flash("error", "Invalid OTP");
    return res.redirect("/admin/verify-otp");
  }

  req.session.verifiedAdmin = { email, password };
  otpMap.delete(email);
  res.redirect("/admin/finalize");
});

router.get("/finalize", (req, res) => {
  if (!req.session.verifiedAdmin) {
    req.flash("error", "OTP not verified");
    return res.redirect("/admin/create");
  }
  res.render("finalize");
});

router.post("/finalize", async (req, res) => {
  const data = req.session.verifiedAdmin;
  if (!data) {
    req.flash("error", "Session expired");
    return res.redirect("/admin/create");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);
  const newAdmin = new Admin({ email: data.email.toLowerCase(), password: hashedPassword });

  try {
    await newAdmin.save();
    req.session.verifiedAdmin = null;
    req.session.pendingAdminEmail = null;
    req.flash("success", "Admin created successfully");
    res.redirect("/admin/login");
  } catch (err) {
    console.error(err);
    req.flash("error", "Error saving admin");
    res.redirect("/admin/create");
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
