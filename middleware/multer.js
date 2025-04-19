const multer = require("multer");

// Setup multer for file uploads
const storage = multer.diskStorage({
    destination: dropFolder,
    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        cb(null, `${Date.now()}_${safeName}`);
    },
});

export const upload = multer({ storage });