const express = require("express");
const router = express.Router();
const ensureAuthenticated = require('../config/ensureAuthenticated');
const Donation = require('../models/donation')
const deleteExpiredDonations = require('../config/cronJobs'); // Adjust path if needed
deleteExpiredDonations(); // Start the scheduled task


router.get("/:foodId", ensureAuthenticated, async function (req, res, next) {
    const foodId = req.params.foodId;

    try {
        // Find donation and populate the 'user' field
        const food = await Donation.findById(foodId).populate('user');


        if (!food) {
            return res.status(404).send('Food not found');
        }

        res.render("foodDetails", {
            food,
            error: req.flash('error'),
            success: req.flash('success')


        });

    } catch (err) {
        next(err); // Pass error to the error handler
    }
});

module.exports = router;