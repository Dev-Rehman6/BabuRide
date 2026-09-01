const multer = require('multer');
const path = require('path');

const fileFilter = (req, file, cb) => {
  // Allowed extensions
  const filetypes = /jpeg|jpg|png|webp/;
  
  // Check extension
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime type
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype || extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (png, jpg, jpeg, webp) are allowed!'), false);
  }
};

const upload = multer({ 
  storage: multer.memoryStorage(), // or diskStorage
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: fileFilter 
});

module.exports = upload;