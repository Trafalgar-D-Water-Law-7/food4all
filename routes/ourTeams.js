const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const upload = require("../config/storage");
const ourTeams = require("../models/ourTeams")
const successRequestDonation = require("../models/successRequestDonation")
const crypto = require('crypto');
const transporter = require('../config/mailer');
const nodemailer = require("nodemailer");

const { ensureUserLoggedIn,preventUserIfLoggedIn,preventMemberIfLoggedIn } = require('../middleware/auth');




router.get("/", function (req, res) {
  res.render("ourTeams", {
    success: req.flash('success'),
    error: req.flash('error')
  })
})
router.get("/login",preventMemberIfLoggedIn, function (req, res) {
  res.render("memberLogin", {
    success: req.flash('success'),
    error: req.flash('error')
  })
});


router.get('/readyToPick',preventUserIfLoggedIn, async (req, res) => {
  try {
    if (!req.session.memberId) {
      req.flash('error', 'You must log in first.');
      return res.redirect('/ourTeams/login');
    }

    const member = await ourTeams.findById(req.session.memberId);
    if (!member) {
      req.flash('error', 'Member not found.');
      return res.redirect('/');
    }

    // Only fetch donations that are not yet picked by anyone
    const donations = await successRequestDonation.find({ pickedBy: null })
      .populate('donor')
      .populate('recipient')
      .populate({
        path: 'foodRequest',
        populate: { path: 'user' }
      });

    res.render("readyToPick", {
      success: req.flash('success'),
      error: req.flash('error'),
      member,
      donations  // ✅ Only unpicked donations sent to view
    });

  } catch (error) {
    console.error("Error fetching unpicked donations:", error);
    req.flash('error', 'Something went wrong.');
    res.redirect('/');
  }
});




router.get('/memberProfile',preventUserIfLoggedIn,  async (req, res) => {
  try {
    if (!req.session.memberId) {
      req.flash('error', 'You must log in first.');
      return res.redirect('/ourTeams/login');
    }

    const member = await ourTeams.findById(req.session.memberId);
    if (!member) {
      req.flash('error', 'Member not found.');
      return res.redirect('/');
    }

    // Get only donations picked by this member
    const pickedByMe = await successRequestDonation.find({ pickedBy: member._id })
      .populate('donor')
      .populate('recipient')
      .populate('pickedBy')
      .populate({
        path: 'foodRequest',
        populate: { path: 'user' }
      });

    res.render("memberProfile", {
      success: req.flash('success'),
      error: req.flash('error'),
      member,
      pickedByMe // 👈 Pass it to the view
    });

  } catch (error) {
    console.error("Error fetching member profile:", error);
    req.flash('error', 'Something went wrong.');
    res.redirect('/');
  }
});




router.post('/markPicked/:id',preventUserIfLoggedIn,  async (req, res) => {
  try {
    if (!req.session.memberId) return res.redirect('/login');

    await successRequestDonation.findByIdAndUpdate(req.params.id, {
      pickedBy: req.session.memberId
    });

    req.flash('success', 'Marked as picked!');
    res.redirect('/ourTeams/memberProfile');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Could not mark as picked.');
    res.redirect('/ourTeams/memberProfile');
  }
});








router.get("/verify-member-otp", preventUserIfLoggedIn, preventMemberIfLoggedIn, (req, res) => {
  res.render("verify-member-otp", {
    title: "Verify Member OTP",
    success: req.flash('success'),
    error: req.flash('error')
  });
});


router.post("/memberSignup", preventMemberIfLoggedIn, preventUserIfLoggedIn, upload.single("photo"), async (req, res) => {
  try {
    const { name, email, phone, address, password } = req.body;
    const photo = req.file ? req.file.filename : null;

    if (!name || !email || !phone || !address || !photo || !password) {
      req.flash("error", "All fields are required!");
      return res.redirect("/memberSignup");
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      req.flash("error", "Invalid phone number format!");
      return res.redirect("/memberSignup");
    }

    const existingUser = await ourTeams.findOne({ email });
    if (existingUser) {
      req.flash("error", "Email already in use!");
      return res.redirect("/memberSignup");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    req.session.memberOTP = otp;
    req.session.memberData = { name, email, phone, address, photo, password: hashedPassword };

    // Send OTP via email
    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "🔐 Plate Share Member Email Verification",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #4CAF50;">Plate Share - Member Email Verification</h2>
          <p>Hello ${name},</p>
          <p>Thank you for signing up as a team member. Use the OTP below to verify your email:</p>
          <h1 style="text-align: center; color: #333;">${otp}</h1>
          <p>If you didn't request this, you can ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    req.flash("success", "✅ OTP sent to your email. Please verify.");
    res.redirect("/ourTeams/verify-member-otp");

  } catch (err) {
    console.error("Error during member signup:", err);
    req.flash("error", "Something went wrong. Please try again.");
    res.redirect("/memberSignup");
  }
});







router.post('/verify-member-otp', async (req, res) => {
  const { otp } = req.body;

  if (otp === req.session.memberOTP) {
    const { name, email, phone, address, photo, password } = req.session.memberData;

    const newTeamMember = new ourTeams({
      name,
      email,
      phone,
      address,
      photo,
      password
    });

    try {
      await newTeamMember.save();
      delete req.session.memberOTP;
      delete req.session.memberData;
      req.flash("success", "✅ Registration complete. You can now log in.");
      res.redirect("/ourTeams/login");
    } catch (err) {
      console.error("Error saving member:", err);
      req.flash("error", "❌ Could not save member. Try again.");
      res.redirect("/ourTeams/memberSignup");
    }
  } else {
    req.flash("error", "❌ Invalid OTP. Please try again.");
    res.redirect("/ourTeams/verify-member-otp");
  }
});




router.post("/login",preventUserIfLoggedIn,  async (req, res) => {
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

    req.session.memberId = teamMember._id; // Store user session
    req.flash("success", "Login successful!");
    res.redirect("/ourTeams/memberProfile"); // Redirect to a protected page
  } catch (error) {
    console.error(error);
    req.flash("error", "Something went wrong. Please try again.");
    res.redirect("/ourteams/login");
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
      if (err) {
          return res.status(500).json({ message: 'Failed to log out.' });
      }
      res.redirect("/ourTeams/login")
  });
});



module.exports = router;