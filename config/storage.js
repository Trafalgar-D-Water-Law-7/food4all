const multer = require('multer');
const crypto = require('crypto');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/uploads'); // Save file in the uploads folder
    },
    filename: (req, file, cb) => {
        // Generate a unique filename using crypto
        const uniqueSuffix = crypto.randomBytes(16).toString('hex'); // Generate random hex string
        const fileExtension = path.extname(file.originalname); // Get file extension
        cb(null, uniqueSuffix + fileExtension); // Use the random string as the filename
    }
});

const upload = multer({ storage: storage });

module.exports = upload;
