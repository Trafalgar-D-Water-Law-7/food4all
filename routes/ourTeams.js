const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const upload = require("../config/storage");
const ourTeams = require("../models/ourTeams")


router.get("/", function (req, res) {
    res.render("ourTeams", {
        success: req.flash('success'),
        error: req.flash('error')
    })
})
router.get("/login", function (req, res) {
    res.render("memberLogin", {
        success: req.flash('success'),
        error: req.flash('error')
    })
});

router.get('/memberProfile', async (req, res) => {
    try {
        // Assuming member ID is stored in session after login
        if (!req.session.memberId) {
            req.flash('error', 'You must log in first.');
            return res.redirect('/login'); // Redirect to login if not logged in
        }

        // Find the logged-in member by ID
        const member = await ourTeams.findById(req.session.memberId);

        if (!member) {
            req.flash('error', 'Member not found.');
            return res.redirect('/'); // Redirect to home or error page
        }

        // Render member profile
        res.render("memberProfile", {
            success: req.flash('success'),
            error: req.flash('error'),
            member
        });
    } catch (error) {
        console.error("Error fetching member profile:", error);
        req.flash('error', 'Something went wrong.');
        res.redirect('/');
    }
});


router.post("/memberSignup", upload.single("photo"), async (req, res) => {
    try {
        const { name, email, role, phone, address, password, latitude, longitude } = req.body;
        const photo = req.file ? req.file.filename : null;

        if (!name || !email || !role || !phone || !address || !photo || !password) {
            req.flash("error", "All fields are required!");
            return res.redirect("/ourTeams/login");
        }

        if (!/^[0-9]{10}$/.test(phone)) {
            req.flash("error", "Invalid phone number format!");
            return res.redirect("/ourTeams/login");
        }

        // Check if email already exists
        const existingUser = await ourTeams.findOne({ email });
        if (existingUser) {
            req.flash("error", "Email already in use!");
            return res.redirect("/ourTeams/login");
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        const newTeamMember = new ourTeams({
            name,
            email,
            role,
            phone,
            address,
            latitude,
            longitude,
            photo,
            password: hashedPassword
        });

        await newTeamMember.save();

        req.flash("success", "User registered successfully!");
        res.redirect("back");
    } catch (err) {
        req.flash("error", err.message);
        res.redirect("/ourTeams/login");
    }
});



router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const teamMember = await ourTeams.findOne({ email });
        if (!teamMember) {
            req.flash("error", "Invalid email or password");
            return res.redirect("/ourTeams/login");
        }

        const isMatch = await bcrypt.compare(password, teamMember.password);
        if (!isMatch) {
            req.flash("error", "Invalid email or password");
            return res.redirect("/ourTeams/login");
        }

        req.session.memberId = teamMember; // Store user session
        req.flash("success", "Login successful!");
        res.redirect("/ourTeams/memberProfile"); // Redirect to a protected page
    } catch (error) {
        console.error(error);
        req.flash("error", "Something went wrong. Please try again.");
        res.redirect("/ourteams/login");
    }
});



module.exports = router;