const cron = require('node-cron');
const moment = require('moment');
const Donation = require('../models/donation'); // Adjust the path as needed

// Schedule a task to run every minute
const deleteExpiredDonations = () => {
    cron.schedule('* * * * *', async () => {
        try {
            const currentTime = moment().toDate();

            const expiredDonations = await Donation.find({
                expiryTime: { $lte: currentTime },
                status: 'claim',
            });

            if (expiredDonations.length > 0) {
                await Donation.deleteMany({ _id: { $in: expiredDonations.map(donation => donation._id) } });
                console.log(`Deleted ${expiredDonations.length} expired donation(s).`);
            } else {
                console.log('No expired donations found.');
            }
        } catch (error) {
            console.error('Error deleting expired donations:', error);
        }
    });
};

// Export the function
module.exports = deleteExpiredDonations;
