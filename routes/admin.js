const express = require("express");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const flash = require("connect-flash");
const Admin = require("../models/admin");
const User = require("../models/user");
const Donation = require("../models/donation");
const router = express.Router();
const Testimonial = require("../models/testimonial")

// Middleware to check if admin is logged in
function isAuthenticated(req, res, next) {
    if (req.session.admin) return next();
    req.flash("error", "Please log in first");
    res.redirect("/admin/login");
}


// Create Admin(Admin Creation Route)
router.post("/create", async (req, res) => {
    const { username, password } = req.body;

    // Check if the admin already exists
    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
        req.flash("error", "Admin username already exists");
        return res.redirect("/admin/create");
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new Admin instance
    const admin = new Admin({
        username,
        password: hashedPassword,
    });

    try {
        await admin.save();
        req.flash("success", "Admin created successfully");
        res.redirect("/admin/login"); // Redirect to login page after successful creation
    } catch (err) {
        console.error(err);
        req.flash("error", "Failed to create admin");
        res.redirect("/admin/create");
    }
});

// Login Page
router.get("/login", (req, res) => {
    res.render("adminLogin", {
        success: req.flash('success'),
        error: req.flash('error')
    });
});

// Handle Login
router.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });

    if (!admin || !(await bcrypt.compare(password, admin.password))) {
        req.flash("error", "Invalid credentials");
        return res.redirect("/admin/login");
    }

    req.session.admin = admin;
    req.flash('success', '✅ Admin Login Successfull');
    res.redirect("/admin");
});

// Admin Dashboard
router.get("/", isAuthenticated, async (req, res) => {
    try {
        const users = await User.find().populate("donations"); // Corrected populate syntax
        res.render("admin", {
            admin: req.session.admin, users,
            success: req.flash('success'),
            error: req.flash('error')
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});

// POST route to update admin details
router.post("/update", isAuthenticated, async (req, res) => {
    const { username, newPassword } = req.body;

    // Check if the admin is logged in
    const admin = await Admin.findOne({ _id: req.session.admin._id });

    if (!admin) {
        req.flash("error", "Admin not found");
        return res.redirect("/admin"); // Redirect to admin page if admin is not found
    }

    try {
        admin.username = username;
        if (newPassword) {
            admin.password = await bcrypt.hash(newPassword, 10); // Hash new password
        }

        await admin.save(); // Save the changes to the database
        req.flash("success", "Profile updated successfully");
        req.session.destroy(() => {
            res.redirect("/admin/login");
        });
    } catch (error) {
        console.error(error);
        req.flash("error", "Failed to update profile");
        res.redirect("/admin"); // Redirect back on error
    }
});



// Logout Route
router.get("/admin/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/admin/login");
    });
});




// Delete user
router.delete("/user/:id", async (req, res) => {
    try {
        const userId = req.params.id;

        // Delete user
        await User.findByIdAndDelete(userId);

        // Delete all donations made by the user
        await Donation.deleteMany({ user: userId });

        // Delete all feedback submitted by the user
        await Testimonial.deleteMany({ user: userId });

        res.sendStatus(200);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});


// Delete food donation
router.delete("/donation/:id", async (req, res) => {
    try {
        const donationId = req.params.id;
        await Donation.findByIdAndDelete(donationId);
        res.sendStatus(200);
    } catch (error) {
        console.error(error);
        res.sendStatus(500);
    }
});






module.exports = router;
