const multer = require('multer');
const crypto = require('crypto');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/uploads');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = crypto.randomBytes(16).toString('hex');
        const fileExtension = path.extname(file.originalname);
        const finalName = uniqueSuffix + fileExtension;

        // Construct relative path
        const relativePath = `uploads/${finalName}`;

        // Support for single and multiple uploads
        if (!req.savedFilePaths) {
            req.savedFilePaths = [];
        }
        req.savedFilePaths.push(relativePath); // Always push to array
        req.savedFilePath = relativePath; // Last one is the "single" path fallback

        cb(null, finalName);
    }
});

const upload = multer({ storage });

module.exports = upload;
