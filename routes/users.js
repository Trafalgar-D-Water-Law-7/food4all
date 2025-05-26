
var express = require('express');
const router = express.Router();
require("dotenv").config();
const bcrypt = require('bcryptjs'); // For password hashing
const User = require('../models/user');
const moment = require("moment");
const nodemailer = require("nodemailer");
const Donation = require('../models/donation'); // Import the donation model
const FoodRequest = require('../models/request');
const upload = require('../config/storage');
const transporter = require('../config/mailer');
const crypto = require('crypto');
const generateToken = require('../config/generateToken');




const deleteExpiredDonations = require('../config/cronJobs'); // Adjust path if needed
deleteExpiredDonations(); // Start the scheduled task

const { ensureUserLoggedIn, preventUserIfLoggedIn, preventMemberIfLoggedIn } = require('../middleware/auth');
const { CompositionListInstance } = require('twilio/lib/rest/video/v1/composition');





router.post('/signup', preventMemberIfLoggedIn, upload.single('photo'), async (req, res) => {
    try {
        const { name, email, password, street, contact, latitude, longitude } = req.body;
        console.log(req.body);

        // Optional photo
        const photo = req.savedFilePath || null;

        // Check if email or contact already exists
        const existingUser = await User.findOne({ $or: [{ email }, { contact }] });
        if (existingUser) {
            req.flash('error', '❌ Email or Contact number already in use.');
            return res.redirect('/users/signup');
        }

        // Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate OTP
        const otp = crypto.randomInt(100000, 999999).toString(); // 6-digit OTP

        // Save OTP and user data in session
        req.session.otp = otp;
        req.session.userData = {
            name,
            email,
            password: hashedPassword,
            street,
            contact,
            photo,
        };

        // Email setup
        const mailOptions = {
            from: `"Plate Share" <${process.env.EMAIL}>`,
            to: email,
            subject: '🔐 Verify Your Email - Plate Share',
            html: `
                <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 20px;">
                    <div style="max-width: 600px; margin: auto; background: white; border-radius: 10px; padding: 30px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
                        <h2 style="color: #4CAF50;">Welcome to Plate Share!</h2>
                        <p style="font-size: 16px; color: #333;">We're excited to have you on board. To complete your registration, please use the OTP below to verify your email address:</p>
                        <div style="font-size: 28px; font-weight: bold; color: #4CAF50; margin: 20px 0;">${otp}</div>
                        <p style="font-size: 14px; color: #777;">This OTP is valid for 10 minutes. If you didn't request this, please ignore this email.</p>
                        <hr style="margin: 30px 0;">
                        <p style="font-size: 12px; color: #aaa;">© ${new Date().getFullYear()} Plate Share. All rights reserved.</p>
                    </div>
                </div>
            `,
            text: `Your OTP for Plate Share is: ${otp}. It is valid for 10 minutes.`,
        };

        // Send OTP email
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error);
                req.flash('error', '❌ Failed to send OTP. Please try again.');
                return res.redirect('/users/signup');
            }
            console.log('Email sent: ' + info.response);
            req.flash('success', '✅ OTP sent to your email!');
            res.redirect('/users/verify-otp');
        });

    } catch (error) {
        console.error(error);
        req.flash('error', '❌ Something went wrong. Please try again.');
        res.redirect('/users/signup');
    }
});




router.get('/verify-otp', preventMemberIfLoggedIn, preventUserIfLoggedIn, (req, res) => {
    res.render('verify-otp', {
        title: 'Verify OTP',
        error: req.flash('error'),
        success: req.flash('success')
    });
})

router.post('/verify-otp', async (req, res) => {
    const { otp } = req.body;

    // Check if OTP matches the one stored in session
    if (otp === req.session.otp) {
        try {
            const { name, email, password, street, contact, photo, latitude, longitude } = req.session.userData;

            // Create a new user with the provided details
            const newUser = new User({
                name,
                email,
                password,
                street,
                contact,
                photo,
                location: {
                    type: 'Point',
                    coordinates: [parseFloat(longitude), parseFloat(latitude)],
                    donationCount: 0
                },
            });

            // Save the new user to the database
            await newUser.save();

            // Clear OTP and session data
            delete req.session.otp;
            delete req.session.userData;

            req.flash('success', '✅ User registered successfully!');
            res.redirect('/users/login');
        } catch (error) {
            console.error(error);
            req.flash('error', '❌ Something went wrong. Please try again.');
            res.redirect('/users/verify-otp');
        }
    } else {
        req.flash('error', '❌ Invalid OTP. Please try again.');
        res.redirect('/users/verify-otp'); // Redirect back to OTP verification page
    }
});



router.post('/update', preventMemberIfLoggedIn, upload.single('photo'), async (req, res) => {
    try {
        const { userId } = req.session; // Assuming userId is stored in session
        if (!userId) {
            req.flash('error', '❌ Unauthorized request. Please log in.');
            return res.redirect('/users/login');
        }

        const user = await User.findById(userId);
        if (!user) {
            req.flash('error', '❌ User not found.');
            return res.redirect('/users/user'); // Redirect to profile page
        }

        // Destructure input values
        const { name, email, password, contact } = req.body;
        let photo = req.file ? req.savedFilePath : user.photo; // Keep old photo if none uploaded

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
        const { name, email, subject, message, expiryTime, latitude, longitude } = req.body;

        // Basic validation
        if (!email || !subject || !expiryTime) {
            req.flash('error', '❌ Missing required fields.');
            return res.redirect('/users/donate');
        }

        const user = await User.findOne({ email }).lean();
        if (!user) {
            req.flash('error', '❌ User not found.');
            return res.redirect('/donate');
        }

        const photoPaths = req.savedFilePaths || [];
        if (!Array.isArray(photoPaths) || photoPaths.length === 0) {
            req.flash('error', '❌ At least one photo is required.');
            return res.redirect('/users/donate');
        }

        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);

        if (isNaN(lat) || isNaN(lon)) {
            req.flash('error', '❌ Invalid location data.');
            return res.redirect('/users/donate');
        }

        // Prevent duplicate donation (same user, subject, and location within short time)
        const recentDonation = await Donation.findOne({
            user: user._id,
            subject,
            latitude: lat,
            longitude: lon,
            createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // within last 5 mins
        });

        if (recentDonation) {
            req.flash('error', '⚠️ Duplicate donation detected.');
            return res.redirect('/users/donate');
        }

        const expiryDate = moment().add(parseInt(expiryTime, 10), 'hours').toDate();

        const donationData = {
            name,
            email,
            subject,
            message,
            expiryTime: expiryDate,
            claimedToken: generateToken(),
            user: user._id,
            donatedBy: user._id,
            latitude: lat,
            longitude: lon,
            photos: photoPaths
        };

        const donation = await Donation.create(donationData);

        await User.updateOne(
            { _id: user._id },
            {
                $inc: { donationCount: 1 },
                $push: { donations: donation._id }
            }
        );

        sendTokenEmail(email, name, donation.claimedToken).catch(err =>
            console.error("❌ Failed to send email:", err)
        );

        req.flash('success', '✅ Food donated successfully!');
        res.redirect('/');
    } catch (error) {
        console.error("Donation Error:", error);
        req.flash('error', '❌ Something went wrong. Please try again.');
        res.redirect('/');
    }
});




//   / DELETE /donation/:id
router.delete('/donation/:id', async (req, res) => {
    try {
        const donationId = req.params.id;

        // Find the donation
        const donation = await Donation.findById(donationId);

        if (!donation) {
            return res.status(404).json({ error: 'Donation not found' });
        }

        const userId = donation.user; // Assuming the 'user' field stores the reference to the User

        // Decrease donation count for the user
        await User.findByIdAndUpdate(userId, {
            $inc: { donationCount: -1 },
            $pull: { donations: donationId } // Optional: remove donation ID from user's donations array
        });

        // Delete the donation
        await Donation.findByIdAndDelete(donationId);

        res.status(200).json({ message: 'Donation deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});



router.get("/user", preventMemberIfLoggedIn, async (req, res) => {
    try {
        const userId = req.session.userId;

        const claimedFood = await Donation.find({ claimedBy: userId }).populate('claimedBy');



        if (!userId) {
            req.flash('error', 'User not logged in');
            return res.redirect('/users/login');
        }

        const user = await User.findById(userId);
        if (!user) {
            req.flash('error', 'User not found');
            return res.redirect('/');
        }

        const requests = await FoodRequest.find({ user: userId }).sort({ createdAt: -1 });

        // Format request timestamps
        const formattedRequests = requests.map(req => ({
            ...req._doc,
            timeAgo: moment(req.createdAt).fromNow()
        }));

        const donatedFoods = await Donation.find({ user: userId })
            .populate("claimedBy")
            .sort({ createdAt: -1 });

        // Format donation timestamps
        const formattedDonations = donatedFoods.map(donation => ({
            ...donation._doc,
            timeAgo: moment(donation.createdAt).fromNow()
        }));

        res.render("user", {
            claimedFood,
            donatedFoods: formattedDonations,
            username: user.name,
            user,
            requests: formattedRequests,
            userId,
            error: req.flash('error'),
            success: req.flash('success')
        });

    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).send("Server error while fetching profile.");
    }
});


router.get("/claimedFood", preventMemberIfLoggedIn, async (req, res) => {
    try {
        const userId = req.session.userId;

        if (!userId) {
            req.flash('error', 'User not logged in');
            return res.redirect('/users/login');
        }

        const claimedFood = await Donation.find({ claimedBy: userId }).populate('donatedBy');
        // Log each claimed food's claimer's name
        claimedFood.forEach(food => {
            console.log('Claimed by user name:', food.donatedBy?.name);
        });


        if (!claimedFood || claimedFood.length === 0) {
            req.flash('error', 'No claimed food found.');
            return res.redirect('/users/user');
        }



        res.render("myClaimedFood", {
            claimedFood,
            userId,
            error: req.flash('error'),
            success: req.flash('success')
        });

    } catch (error) {
        console.error("Error fetching claimed food:", error);
        res.status(500).send("Server error while fetching claimed food.");
    }
});




router.get("/myFoodRequests", preventMemberIfLoggedIn, async (req, res) => {
    try {
        const userId = req.session.userId;

        if (!userId) {
            req.flash('error', 'User not logged in');
            return res.redirect('/user/login');
        }

        const requests = await FoodRequest.find({ user: userId })
            .sort({ createdAt: -1 })
            .populate('wantToDonate');

            console.log("Food Requests:", requests[0]);

        // Format request timestamps
        const formattedRequests = requests.map(req => ({
            ...req._doc,
            timeAgo: moment(req.createdAt).fromNow()
        }));

        if (!formattedRequests || formattedRequests.length === 0) {
            req.flash('error', 'No Requested food found.');
            return res.redirect('/users/user');
        }

        res.render("myRequest", {
            requests: formattedRequests,
            userId,
            error: req.flash('error'),
            success: req.flash('success')
        });

    } catch (error) {
        console.error("Error fetching food requests:", error);
        res.status(500).send("Server error while fetching food requests.");
    }
});




router.get("/myFoodDonation", preventMemberIfLoggedIn, async (req, res) => {
    try {
        const userId = req.session.userId;

        if (!userId) {
            req.flash('error', 'User not logged in');
            return res.redirect('/users/login');
        }



        const donatedFoods = await Donation.find({ user: userId })
            .populate("claimedBy")
            .sort({ createdAt: -1 });

        // Format donation timestamps
        const formattedDonations = donatedFoods.map(donation => ({
            ...donation._doc,
            timeAgo: moment(donation.createdAt).fromNow()
        }));
        res.render("myDonation", {
            donatedFoods: formattedDonations,
            userId,
            error: req.flash('error'),
            success: req.flash('success')
        });

    } catch (error) {
        console.error("Error fetching food requests:", error);
        res.status(500).send("Server error while fetching food requests.");
    }
});



router.post("/confirmPickup", preventMemberIfLoggedIn, async (req, res) => {
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







router.get('/signup', preventMemberIfLoggedIn, preventUserIfLoggedIn, function (req, res, next) {
    res.render('signup', {
        title: 'Express',
        error: req.flash('error'),
        success: req.flash('success')
    });
});

router.get('/login', preventMemberIfLoggedIn, preventUserIfLoggedIn, function (req, res, next) {
    res.render('userLogin', {
        title: 'Express',
        userId: req.session.userId,
        error: req.flash('error'),
        success: req.flash('success')
    });
});



router.post('/login', preventMemberIfLoggedIn, async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            req.flash('error', '❌ User not found.');
            return res.redirect('/users/login');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            req.flash('error', '❌ Invalid Password');
            return res.redirect('/users/login');
        }

        // ✅ Clear any member session
        req.session.memberId = null;

        // ✅ Set user session
        req.session.userId = user._id;
        req.session.username = user.username;
        req.flash('success', '✅ User Logged in successfully!');
        res.redirect('/users/user');
    } catch (error) {
        console.error('Login error:', error);
        req.flash('error', 'Something went wrong.');
        res.redirect('/users/login');
    }
});



router.get('/donate', preventMemberIfLoggedIn, ensureUserLoggedIn, async (req, res) => {
    try {
        const userId = req.session.userId;
        const user = await User.findById(userId);

        if (!user) {
            req.flash('error', 'User not found.');
            return res.redirect('/users/login');
        }

        // Check today's date range
        const startOfDay = moment().startOf('day').toDate();
        const endOfDay = moment().endOf('day').toDate();

        const todayDonations = await Donation.find({
            donatedBy: userId,
            createdAt: { $gte: startOfDay, $lte: endOfDay }
        });


        if (todayDonations.length >= 3) {
            req.flash('error', 'You have reached the limit of 3 donations for today.');
            return res.redirect('/'); // Or wherever you want to redirect
        }


        const totalDonations = await Donation.estimatedDocumentCount();

        res.render('donate', {
            user,
            totalDonations,
            error: req.flash('error'),
            success: req.flash('success')
        });

    } catch (error) {
        console.error("🚨 Donation Page Error:", error);
        res.status(500).send('Server error loading donation page.');
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


router.post("/claim/:id", preventMemberIfLoggedIn, async (req, res) => {
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
router.get("/profile/:userId", preventMemberIfLoggedIn, async (req, res) => {
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



// DELETE /request/:id
router.delete('/request/:id', async (req, res) => {
    const { id } = req.params;

    // Check if ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send('Invalid ID');
    }

    try {
        await FoodRequest.findByIdAndDelete(id);
        res.status(200).send('Request deleted');
    } catch (error) {
        console.error('Error deleting request:', error);
        res.status(500).send('Error deleting request');
    }
});

// Step 1: Render forget password page
router.get('/cpu-forgot-password', (req, res) => {
    res.render('forgetPassword/cpu-forget-password', {
        error: req.flash('error'),
        success: req.flash('success')
    });
});

// Step 1: Handle email + send OTP
router.post('/cpu-forgot-password', async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        req.flash('error', 'User not found');
        return res.redirect('/users/cpu-forgot-password');
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    req.session.otp = otp;
    req.session.email = email;
    req.session.otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    req.session.otpVerified = false; // Mark as not verified yet

    try {
        await transporter.sendMail({
            from: process.env.EMAIL,
            to: email,
            subject: 'Your OTP for Password Reset',
            text: `Your OTP is: ${otp}. It will expire in 10 minutes.`,
        });

        req.flash('success', 'OTP sent to your email');
        res.redirect('/users/cpu-verify-otp');
    } catch (err) {
        console.error('Email send error:', err);
        req.flash('error', 'Failed to send OTP');
        res.redirect('/users/cpu-forgot-password');
    }
});

// Step 2: Render OTP verification page
router.get('/cpu-verify-otp', (req, res) => {
    res.render('forgetPassword/cpu-verify-otp', {
        error: req.flash('error'),
        success: req.flash('success')
    });
});

// Step 2: Verify OTP
router.post('/cpu-verify-otp', (req, res) => {
    const { otp } = req.body;

    if (
        req.session.otp &&
        otp == req.session.otp &&
        Date.now() < req.session.otpExpiry
    ) {
        req.session.otpVerified = true; // ✅ Set OTP verified flag
        req.flash('success', 'OTP verified. Please reset your password.');
        res.redirect('/users/cpu-change-password');
    } else {
        req.flash('error', 'Invalid or expired OTP');
        res.redirect('/users/cpu-verify-otp');
    }
});

// Step 3: Render password reset page (Only if OTP is verified)
router.get('/cpu-change-password', (req, res) => {
    if (!req.session.otpVerified) {
        req.flash('error', 'Please verify OTP first');
        return res.redirect('/users/cpu-forgot-password');
    }

    res.render('forgetPassword/cpu-change-password', {
        error: req.flash('error'),
        success: req.flash('success')
    });
});

// Step 3: Handle new password (Only if OTP is verified)
router.post('/cpu-change-password', async (req, res) => {
    if (!req.session.otpVerified) {
        req.flash('error', 'Unauthorized access');
        return res.redirect('/users/cpu-forgot-password');
    }

    const { password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
        req.flash('error', 'Passwords do not match');
        return res.redirect('/users/cpu-change-password');
    }

    const user = await User.findOne({ email: req.session.email });

    if (!user) {
        req.flash('error', 'User not found');
        return res.redirect('/users/cpu-change-password');
    }

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    // ✅ Clear session after successful password change
    req.session.otp = null;
    req.session.email = null;
    req.session.otpExpiry = null;
    req.session.otpVerified = null;

    req.flash('success', 'Password changed successfully');
    res.redirect('/users/login');
});


module.exports = router;
