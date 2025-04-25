var express = require('express');
var express = require('express');
var router = express.Router();
require("dotenv").config();
const Donation = require('../models/donation'); // Import the donation model
const upload = require('../config/storage');
const ourTeam = require('../models/ourTeams');


router.get('/', async function (req, res, next) {
  try {
    const now = new Date();
    const donations = await Donation.find({
      status: 'claim',
      expiryTime: { $gte: now }
    });

    res.render('index', {
      donations,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

router.get("/who-are-you", (req, res) => {
  res.render('login', {
    success: req.flash('success'),
    error: req.flash('error')
  })
})



router.get('/about', function (req, res, next) {
  res.render('about', {
    title: 'Express',
    success: req.flash('success'),
    error: req.flash('error')
  });
});
router.get('/contact', function (req, res, next) {
  res.render('contact', {
    title: 'Express',
    success: req.flash('success'),
    error: req.flash('error')
  });
});
router.get('/service', function (req, res, next) {
  res.render('service', {
    title: 'Express',
    success: req.flash('success'),
    error: req.flash('error')
  });
});
router.get('/team', async function (req, res, next) {
  const team = await ourTeam.find()
  res.render('team', {
    title: 'Express',
    success: req.flash('success'),
    error: req.flash('error'),
    team
  });
});








router.put('/update/profile', upload.single('photo'), async (req, res) => {
  try {
    const { name, email, contact, city, country } = req.body;
    const photo = req.file ? req.file.filename : req.user.photo; // Keep old photo if not updated

    // Find and update user in the database
    await User.findByIdAndUpdate(req.user._id, {
      name, email, contact, city, country, photo
    });

    req.flash('success', 'Profile updated successfully!');
    res.redirect('/');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to update profile');
    res.redirect('/users/profile');
  }
}); router.put('/update/profile', upload.single('photo'), async (req, res) => {
  try {
    const { name, email, contact, city, country } = req.body;
    const photo = req.file ? req.file.filename : req.user.photo; // Keep old photo if not updated

    // Find and update user in the database
    await User.findByIdAndUpdate(req.user._id, {
      name, email, contact, city, country, photo
    });

    req.flash('success', 'Profile updated successfully!');
    res.redirect('/');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Failed to update profile');
    res.redirect('/users/profile');
  }
});

router.get('/memeberSignup', function (req, res) {
  res.render("memeberSignup", {
    success: req.flash('success'),
    error: req.flash('error'),
  })
})



module.exports = router;
