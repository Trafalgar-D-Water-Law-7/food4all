const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        required: true,
        minlength: 5,
        maxlength: 500
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// ✅ Prevent OverwriteModelError
const Testimonial = mongoose.models.Testimonial || mongoose.model('Testimonial', feedbackSchema);

module.exports = Testimonial;
