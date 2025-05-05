const express = require('express');
const router = express.Router();
require('dotenv').config();
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const Donation = require('../models/donation');
const ourTeam = require('../models/ourTeams');
const upload = require('../config/storage');

// ------------------
// eSewa Configuration
// ------------------
const {
  ESEWA_MERCHANT_CODE,
  ESEWA_SECRET_KEY,
  ESEWA_GATEWAY_URL,
  ESEWA_SUCCESS_URL,
  ESEWA_FAILURE_URL
} = process.env;

// ------------------
// Signature Generator for eSewa
// ------------------
function generateSignature(total_amount, transaction_uuid, product_code, secret_key) {
  const message = `total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${product_code}`;
  return crypto.createHmac('sha256', secret_key).update(message).digest('base64');
}

// ------------------
// Home Page - Shows Available Donations
// ------------------
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const donations = await Donation.find({
      status: 'claim',
      expiryTime: { $gte: now }
    });

    res.render('index', {
      donations,
      userId: req.session.userId,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// ------------------
// Donation Form Submission -> eSewa Redirect
// ------------------
router.post('/donate', (req, res) => {
  const { amount, message } = req.body;
  const transaction_uuid = uuidv4();
  const signature = generateSignature(amount, transaction_uuid, ESEWA_MERCHANT_CODE, ESEWA_SECRET_KEY);

  res.render('esewaForm', {
    amount,
    message,
    transaction_uuid,
    product_code: ESEWA_MERCHANT_CODE,
    signature,
    esewaGatewayUrl: ESEWA_GATEWAY_URL,
    success_url: ESEWA_SUCCESS_URL,
    failure_url: ESEWA_FAILURE_URL
  });
});

// ------------------
// eSewa Payment Callbacks
// ------------------
router.get('/payment/success', (req, res) => {
  res.render('success', {
    success: req.flash('success'),
    error: req.flash('error')
  });
});

router.get('/payment/failure', (req, res) => {
  res.render('failure', {
    success: req.flash('success'),
    error: req.flash('error')
  });
});

// ------------------
// Public Pages
// ------------------
router.get('/about', (req, res) => {
  res.render('about', {
    title: 'About',
    success: req.flash('success'),
    error: req.flash('error')
  });
});

router.get('/contact', (req, res) => {
  res.render('contact', {
    title: 'Contact',
    success: req.flash('success'),
    error: req.flash('error')
  });
});

router.get('/service', (req, res) => {
  res.render('service', {
    title: 'Services',
    success: req.flash('success'),
    error: req.flash('error')
  });
});

router.get('/team', async (req, res) => {
  try {
    const team = await ourTeam.find();
    res.render('team', {
      title: 'Our Team',
      team,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// ------------------
// Member Signup Page
// ------------------
router.get('/memeberSignup', (req, res) => {
  res.render('memeberSignup', {
    success: req.flash('success'),
    error: req.flash('error')
  });
});

module.exports = router;
