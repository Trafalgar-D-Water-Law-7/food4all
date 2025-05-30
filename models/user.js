const mongoose = require('mongoose');
const Donation = require('./donation');
const FoodRequest = require('./request'); 
const Testimonial = require('./testimonial'); 
const SuccessRequestDonation = require('./successRequestDonation');
const sendEmail = require('../config/sendEmail'); // adjust path


const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    feedback: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Testimonial' }],
    street: { type: String, required: true },
    contact: { type: String, required: true },
    photo: { type: String },
    donationCount: { type: Number, default: 0 },
    donations: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Donation'
    }]
}, { timestamps: true });

userSchema.post('findOneAndDelete', async function (doc) {
  if (!doc) return;

  try {
    await Donation.deleteMany({ donatedBy: doc._id });
    await FoodRequest.deleteMany({ user: doc._id });
    await Testimonial.deleteMany({ user: doc._id });

    const successDonations = await SuccessRequestDonation.find({ recipient: doc._id }).populate('donor');

    for (const record of successDonations) {
      if (record.donor?.email) {
        await sendEmail(
          record.donor.email,
          "Food Request Cancelled",
          `<p>Hello ${record.donor.name},</p>
           <p>The recipient of your fulfilled food request has deleted their account. This request is now cancelled and removed.</p>
           <p>Thank you for your kindness.</p>`
        );
      }
    }

    await SuccessRequestDonation.deleteMany({ recipient: doc._id });

    console.log(`Deleted donations and requests by user ${doc._id}`);
  } catch (err) {
    console.error('Error in user deletion hook:', err);
  }
});


// ✅ Prevent OverwriteModelError
const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;
