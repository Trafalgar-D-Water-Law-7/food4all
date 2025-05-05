const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const upload = require("../config/storage");
const ourTeams = require("../models/ourTeams")
const FoodRequest = require("../models/request")
const successRequestDonation = require("../models/successRequestDonation")


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


router.get('/readyToPick', async (req, res) => {
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




router.get('/memberProfile', async (req, res) => {
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




router.post('/markPicked/:id', async (req, res) => {
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





router.post("/memberSignup", upload.single("photo"), async (req, res) => {
  try {
    const { name, email, phone, address, password } = req.body;
    const photo = req.file ? req.file.filename : null;

    // Basic validations
    if (!name || !email || !phone || !address || !photo || !password) {
      req.flash("error", "All fields are required!");
      return res.redirect("/ourTeams/memberSignup");
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      req.flash("error", "Invalid phone number format!");
      return res.redirect("/ourTeams/memberSignup");
    }

    // Check if email already exists
    const existingUser = await ourTeams.findOne({ email });
    if (existingUser) {
      req.flash("error", "Email already in use!");
      return res.redirect("/ourTeams/memberSignup");
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save new member
    const newTeamMember = new ourTeams({
      name,
      email,
      phone,
      address,
      photo,
      password: hashedPassword
    });

    await newTeamMember.save();

    req.flash("success", "You have successfully registered! Please login.");
    res.redirect("/ourTeams/login"); // now you redirect to login cleanly after success
  } catch (err) {
    console.error("Error during signup:", err);
    req.flash("error", "Something went wrong. Please try again.");
    res.redirect("/ourTeams/memberSignup");
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