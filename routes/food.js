const express = require("express");
const router = express.Router();
const ensureAuthenticated = require('../config/ensureAuthenticated');
const Donation = require('../models/donation')
const deleteExpiredDonations = require('../config/cronJobs'); // Adjust path if needed
deleteExpiredDonations(); // Start the scheduled task


const mongoose = require('mongoose');

router.get("/:foodId", ensureAuthenticated, async function (req, res, next) {
  const foodId = req.params.foodId;

  // ✅ Validate the ObjectId format first
  if (!mongoose.Types.ObjectId.isValid(foodId)) {
    req.flash('error', 'Invalid food ID.');
    return res.redirect('/'); // Or another appropriate fallback page
  }

  try {
    const food = await Donation.findById(foodId).populate('user');

    if (!food) {
      req.flash('error', 'Food not found.');
      return res.redirect('/');
    }

    res.render("foodDetails", {
      food,
      error: req.flash('error'),
      success: req.flash('success')
    });

  } catch (err) {
    next(err); // Pass error to the global error handler
  }
});


module.exports = router;