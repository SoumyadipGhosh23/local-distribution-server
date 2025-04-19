const multer = require("multer");
const path = require('path');
const os = require('os');

const dropFolder = path.join(os.homedir(), 'Downloads');

// Setup multer for file uploads
const storage = multer.diskStorage({
    destination: dropFolder,
    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        cb(null, `${Date.now()}_${safeName}`);
    },
});

const upload = multer({ storage });

module.exports = {
    upload,
};