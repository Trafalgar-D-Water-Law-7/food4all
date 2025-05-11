const express = require('express');
const router = express.Router();
require('dotenv').config();
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const Donation = require('../models/donation');
const ourTeam = require('../models/ourTeams');
const Contact = require('../models/conatctus');
const transporter = require('../config/mailer'); // adjust path accordingly


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
router.get('/about', async (req, res) => {
  const team = await ourTeam.find();


  res.render('about', {
    title: 'About',
    team,
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


const TWO_HOURS = 2 * 60 * 60 * 1000; // ms

router.post('/contactUs', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (!name || !email || !subject || !message) {
      req.flash('error', 'All fields are required.');
      return res.redirect('/contact');
    }

    const now = new Date();
    const cutoff = new Date(now - TWO_HOURS);

    const recentMessage = await Contact.findOne({
      $or: [{ email }, { ip }],
      createdAt: { $gte: cutoff }
    }).sort({ createdAt: -1 });

    if (recentMessage) {
      req.flash('error', 'You can only send a message once every 2 hours.');
      return res.redirect('/contact');
    }

    const newContact = new Contact({ name, email, subject, message, ip });
    await newContact.save();

    // Send email to your inbox
    const mailOptions = {
      from: `"Contact Form" <${process.env.EMAIL}>`,
      to: 'destination@gmail.com', // Change to your Gmail
      subject: `New Contact Message from ${name}`,
      html: `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong><br>${message}</p>
        <p><strong>IP:</strong> ${ip}</p>
        <p><small>Received on ${new Date().toLocaleString()}</small></p>
      `
    };

    await transporter.sendMail(mailOptions);

    req.flash('success', 'Your message has been sent successfully!');
    res.redirect('/contact');
  } catch (error) {
    console.error('Contact form submission error:', error);
    res.status(500).json({ error: 'An error occurred while submitting the form.' });
  }
});


router.get('/service', (req, res) => {
  res.render('service', {
    title: 'Services',
    success: req.flash('success'),
    error: req.flash('error')
  });
});


// ------------------
// Member Signup Page
// ------------------
router.get('/memberSignup', (req, res) => {
  res.render('memeberSignup', {
    success: req.flash('success'),
    error: req.flash('error')
  });
});

module.exports = router;
