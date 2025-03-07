const Joi = require('joi');
var express = require('express');
const router = express.Router();
require("dotenv").config();
const bcrypt = require('bcrypt'); // For password hashing
const User = require('../models/user');
const moment = require("moment");
const nodemailer = require("nodemailer");
const Donation = require('../models/donation'); // Import the donation model
const FoodRequest = require('../models/request');
const upload = require('../config/storage');
const transporter = require('../config/mailer');
const generateToken = require('../config/generateToken');

const deleteExpiredDonations = require('../config/cronJobs'); // Adjust path if needed
deleteExpiredDonations(); // Start the scheduled task


const ensureAuthenticated = require('../config/ensureAuthenticated');



// Joi Validation Schema
const signupSchema = Joi.object({
    name: Joi.string().min(3).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    confirm_password: Joi.string().valid(Joi.ref('password')).required(),
    street: Joi.string().required(),
    contact: Joi.string().pattern(/^\+\d{1,3}\d{7,12}$/).required(),
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
});

// user creation
router.post('/signup', upload.single('photo'), async (req, res) => {
    try {
        // Validate Input Data
        const { error } = signupSchema.validate(req.body);
        if (error) {
            req.flash('error', error.details[0].message); // Store error message
            return res.redirect('/signup'); // Redirect back to signup page
        }

        const { name, email, password, street, contact, latitude, longitude } = req.body;

        // Check if photo is provided
        if (!req.file) {
            req.flash('error', '❌ Photo is required.');
            return res.redirect('/users/signup');
        }

        const photo = req.file.path.replace('public/', '');

        // Check if email or contact already exists
        const existingUser = await User.findOne({ $or: [{ email }, { contact }] });
        if (existingUser) {
            req.flash('error', '❌ Email or Contact number already in use.');
            return res.redirect('/users/signup');
        }

        // Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create New User with donationCount initialized to 0
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            street,
            contact,
            photo,
            location: {
                type: 'Point',
                coordinates: [parseFloat(longitude), parseFloat(latitude)], // Ensure it's a number
                donationCount: 0
            },
        });

        // Save User
        await newUser.save();
        req.flash('success', '✅ User registered successfully!');
        res.redirect('/users/login');

    } catch (error) {
        console.error(error);
        req.flash('error', '❌ Something went wrong. Please try again.');
        res.redirect('/users/signup'); // Redirect back to signup page
    }
});



router.post('/update', upload.single('photo'), async (req, res) => {
    try {
        const { userId } = req.session; // Assuming userId is stored in session
        if (!userId) {
            req.flash('error', '❌ Unauthorized request. Please log in.');
            return res.redirect('/login');
        }

        const user = await User.findById(userId);
        if (!user) {
            req.flash('error', '❌ User not found.');
            return res.redirect('/users/user'); // Redirect to profile page
        }

        // Destructure input values
        const { name, email, password, contact } = req.body;
        let photo = req.file ? req.file.path.replace('public/', '') : user.photo; // Keep old photo if none uploaded

        // Validate Password if provided
        if (password) {
            const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
            if (!regex.test(password)) {
                req.flash('error', '❌ Password must be at least 6 characters long and include one uppercase letter, one number, and one special character.');
                return res.redirect('/users/user'); // Redirect to profile page
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            user.password = hashedPassword;
        }

        // Update User Data
        user.name = name || user.name;
        user.email = email || user.email;
        user.contact = contact || user.contact;
        user.photo = photo;

        // Save updated user info
        await user.save();

        req.flash('success', '✅ Profile updated successfully!');
        res.redirect('/users/user'); // Redirect to profile page

    } catch (error) {
        console.error(error);
        req.flash('error', '❌ Something went wrong. Please try again later.');
        res.redirect('/users/user'); // Redirect to profile page
    }
});





// Function to send token email
const sendTokenEmail = async (email, name, token) => {
    const mailOptions = {
        from: `"Your Team" <${process.env.EMAIL}>`, // A recognizable sender name
        to: email,
        subject: "Your Food Donation Token",
        html: `
      <h3>Hello ${name},</h3>
      <p>Thank you for your donation! 🍽️</p>
      <p><strong>Your food token is:</strong> <span style="color: blue; font-size: 18px;">${token}</span></p>
      <p>Please keep this token safe and share it only with the receiver.</p>
      <br>
      <p>Best Regards,</p>
      <p><strong>Your Team</strong></p>
    `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Token email sent to ${email}`);
    } catch (err) {
        console.error("Error sending token email:", err);
    }
};

// Handle form submission
router.post('/donate', upload.array('photos', 5), async (req, res) => {
    try {
        // Generate a 6-digit token
        const claimedToken = generateToken();
        const { name, email, subject, message, expiryTime, latitude, longitude } = req.body;
        const photos = req.files; // Array of uploaded files

        // Find the user by email
        const user = await User.findOne({ email });

        if (!user) {
            req.flash('error', '❌ User not found.');
            return res.redirect('/donate'); // Stop execution & redirect
        }

        // Calculate expiry time: current time + user-selected expiry time in hours
        const expiryDate = moment().add(parseInt(expiryTime), 'hours').toDate();

        // Create new donation entry
        const newDonation = new Donation({
            name,
            email,
            subject,
            message,
            expiryTime: expiryDate,
            claimedToken,
            user: user._id,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            donatedBy: user._id,
            photos: photos.map(file => file.path.replace('public/', '')),
        });

        await newDonation.save();

        // Send token email
        await sendTokenEmail(email, name, claimedToken);

        // Increment user's donation count
        user.donationCount = (user.donationCount || 0) + 1;
        user.donations = user.donations || [];
        user.donations.push(newDonation._id);

        await user.save();

        req.flash('success', '✅ Food donated successfully!');
        res.redirect('back'); // Redirect to a thank-you page
    } catch (error) {
        console.error(error);
        req.flash('error', '❌ Something went wrong. Please try again.');
        res.redirect('back'); // Redirect back to donation form
    }
});



router.get("/user", ensureAuthenticated, async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await User.findById(userId);
        const requests = await FoodRequest.find({ user: user })
        // Find all donations made by this user
        const donatedFoods = await Donation.find({ user: userId }).populate("claimedBy name");

        res.render("user", {
            donatedFoods, username: user.name, user,
            requests,
            error: req.flash('error'),
            success: req.flash('success')

        });
    } catch (error) {
        console.error("Error fetching user donations:", error);
        res.status(500).send("Server error while fetching profile.");
    }
});


router.post("/confirmPickup", ensureAuthenticated, async (req, res) => {
    try {
        const { foodId } = req.body;
        const userId = req.session.userId;

        if (!foodId) {
            return res.status(400).json({ message: "Food ID is required." });
        }

        // Find the donation
        const food = await Donation.findById(foodId);

        if (!food) {
            return res.status(404).json({ message: "Food not found." });
        }

        // Ensure only the donor can confirm pickup
        if (food.user.toString() !== userId) {
            return res.status(403).json({ message: "Only the donor can confirm this pickup." });
        }

        // Delete the donation after confirmation
        await Donation.findByIdAndDelete(foodId);

        res.json({ success: true, message: "Food pickup confirmed and removed!" });
    } catch (error) {
        console.error("Error confirming pickup:", error);
        res.status(500).json({ message: "Server error while confirming pickup." });
    }
});




























router.get('/signup', function (req, res, next) {
    res.render('signup', {
        title: 'Express',
        error: req.flash('error'),
        success: req.flash('success')
    });
});

router.get('/login', function (req, res, next) {
    res.render('userLogin', {
        title: 'Express',
        error: req.flash('error'),
        success: req.flash('success')
    });
});




router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if the email exists
        const user = await User.findOne({ email });
        if (!user) {
            req.flash('error', '❌ User not found.');
            return res.redirect('/users/login');  // Redirect to login page
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            req.flash('error', '❌ Invalid Password');
            return res.redirect('/users/login');  // Redirect to login page
        }

        // Store user info in session
        req.session.userId = user._id;
        req.session.username = user.username; // Store additional user data if needed

        // Send success message as a response
        req.flash('success', '✅ User Logged in successfully!');
        res.redirect('/users/user');  // Redirect to the home page or dashboard
    } catch (error) {
        console.error('Login error:', error);  // Log any unexpected errors
        res.status(500).json({ message: 'Something went wrong.' });
    }
});


router.get('/donate', ensureAuthenticated, async (req, res) => {
    try {
        // Get user info from the session
        const userId = req.session.userId;
        const user = await User.findById(userId);
        // Render the donate page, passing user data to the template
        res.render('donate', {
            user: user,
            error: req.flash('error'),
            success: req.flash('success')
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching user data.' });
    }
});




// logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Failed to log out.' });
        }
        res.redirect("/users/login")
    });
});


router.post("/claim/:id", async (req, res) => {
    try {
        const foodId = req.params.id;
        const userId = req.session.userId; // Assuming user session stores their ID

        // Find and update the donation's status and claimedBy
        const updatedDonation = await Donation.findByIdAndUpdate(
            foodId,
            { status: "claimed", claimedBy: userId },
            { new: true }
        );

        if (!updatedDonation) {
            return req.flash('success', '❌ Food Not Found !');

        }

        // Find the user who claimed the food
        const user = await User.findById(userId);
        if (!user) {
            return req.flash('success', '❌ User Not Found!');

        }

        // Send email with the claimed token
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL,
                pass: process.env.PASSWORD,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL,
            to: user.email,
            subject: "Your Food Claim Token 🍽️",
            text: `Hello ${user.name},\n\nYou have successfully claimed the food donation! 🎉\n\nHere is your token: **${updatedDonation.claimedToken}**\n\nPlease keep it safe and present it when collecting the food.\n\nBest Regards,\nYour Team`,
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) console.error("Error sending email:", err);
            else console.log("Email sent:", info.response);
        });

        // Redirect to Google Maps location if available
        if (updatedDonation.latitude && updatedDonation.longitude) {
            return res.redirect(
                `https://www.google.com/maps?q=${updatedDonation.latitude},${updatedDonation.longitude}`
            );
        }

        res.redirect("/");
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error while claiming food." });
    }
});



// Route for displaying the user profile with claimed food donations
router.get("/profile/:userId", ensureAuthenticated, async (req, res) => {
    try {
        const userId = req.params.userId;  // Assuming userId is the user's identifier

        // Fetch all claimed food donations for the user
        const claimedFoods = await Donation.find({ userId: userId, status: "claimed" });
        // console.log(claimedFoods)
        // Render the profile page with claimed foods
        res.render("profile", {
            claimedFoods,
            error: req.flash('error'),
            success: req.flash('success')
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching claimed foods." });
    }
});


module.exports = router;
