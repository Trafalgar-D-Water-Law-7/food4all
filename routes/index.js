var express = require('express');
var express = require('express');
var router = express.Router();
require("dotenv").config();
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const Donation = require('../models/donation'); // Import the donation model
const upload = require('../config/storage');
const ourTeam = require('../models/ourTeams');


// Test credentials and URLs
const MERCHANT_CODE = process.env.ESEWA_MERCHANT_CODE;
const SECRET_KEY = process.env.ESEWA_SECRET_KEY;
const ESEWA_GATEWAY_URL = process.env.ESEWA_GATEWAY_URL;
const SUCCESS_URL = process.env.ESEWA_SUCCESS_URL;
const FAILURE_URL = process.env.ESEWA_FAILURE_URL;


// Signature generator
function generateSignature(total_amount, transaction_uuid, product_code, secret_key) {
  const message = `total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${product_code}`;
  const hash = crypto.createHmac("sha256", secret_key).update(message).digest("base64");
  return hash;
}

// POST: Donation form submission
router.post("/donate", (req, res) => {
  const { amount, message } = req.body;
  const transaction_uuid = uuidv4();
  const signature = generateSignature(amount, transaction_uuid, MERCHANT_CODE, SECRET_KEY);

  res.render("esewaForm", {
    amount,
    message,
    transaction_uuid,
    product_code: MERCHANT_CODE,
    signature,
    esewaGatewayUrl: ESEWA_GATEWAY_URL,
    success_url: SUCCESS_URL,
    failure_url: FAILURE_URL
  });
});

// Success & Failure callbacks
router.get("/success", (req, res) => {
  res.send("✅ Payment was successful!");
});

router.get("/failure", (req, res) => {
  res.send("❌ Payment failed or was cancelled.");
});


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
