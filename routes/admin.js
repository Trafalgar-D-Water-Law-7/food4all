const express = require("express");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const Admin = require("../models/Admin");

const router = express.Router();

// Store OTPs temporarily
const otpMap = new Map();

// Email transporter setup (use real credentials)
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user:process.env.EMAIL, // Your email address
        pass: process.env.PASSWORD, // Use app-specific password
    },
});

// Show email form
router.get("/create", (req, res) => {
    res.render("create");
});

// Handle email + send OTP
router.post("/send-otp", async (req, res) => {
    const { email } = req.body;

    const existing = await Admin.findOne({ email: email.toLowerCase() });
    if (existing) {
        req.flash("error", "Admin already exists with this email");
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

// Show OTP form
router.get("/verify-otp", (req, res) => {
    if (!req.session.pendingAdminEmail) {
        req.flash("error", "Start registration again");
        return res.redirect("/admin/create");
    }
    res.render("verify");
});

// Handle OTP verification
router.post("/verify-otp", (req, res) => {
    const { otp, password } = req.body;
    const email = req.session.pendingAdminEmail;

    const expectedOtp = otpMap.get(email);
    if (expectedOtp !== otp) {
        req.flash("error", "Invalid OTP");
        return res.redirect("/admin/verify-otp");
    }

    req.session.verifiedAdmin = { email, password };
    otpMap.delete(email);
    res.redirect("/admin/finalize");
});

// Show final form (optional)
router.get("/finalize", (req, res) => {
    if (!req.session.verifiedAdmin) {
        req.flash("error", "OTP not verified");
        return res.redirect("/admin/create");
    }
    res.render("finalize");
});

// Save admin
router.post("/finalize", async (req, res) => {
    const data = req.session.verifiedAdmin;
    if (!data) {
        req.flash("error", "Session expired");
        return res.redirect("/admin/create");
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const newAdmin = new Admin({
        email: data.email.toLowerCase(),
        password: hashedPassword,
    });

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




// Show login form
router.get("/login", (req, res) => {
    res.render("adminLogin",
        { error: req.flash("error"), success: req.flash("success") }
    );
});

// Handle login
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
        req.flash("error", "Invalid email or password");
        return res.redirect("/admin/login");
    }

    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
        req.flash("error", "Invalid email or password");
        return res.redirect("/admin/login");
    }

    // Save login session
    req.session.admin = {
        _id: admin._id,
        email: admin.email,
    };

    req.flash("success", "Logged in successfully");
    res.redirect("/");
});

// Admin dashboard (protected)
router.get("/dashboard", (req, res) => {a
    if (!req.session.admin) {
        req.flash("error", "You must log in first");
        return res.redirect("/admin/login");
    }

    res.render("admin/dashboard", { admin: req.session.admin });
});

// Logout
router.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/admin/login");
    });
});

module.exports = router;
