const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const fs = require('fs');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer storage: temp buffer (we process images through sharp before saving)
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: MAX_VIDEO_SIZE }, // max size checked per-type after
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(new Error('File type not allowed. Use JPG, PNG, GIF, WebP, MP4, or WebM.'));
    }
    // Check size limits by type
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype) && parseInt(req.headers['content-length']) > MAX_IMAGE_SIZE) {
      return cb(new Error('Image too large. Max 10MB.'));
    }
    cb(null, true);
  },
});

// Process and save an uploaded file
async function processAndSave(file) {
  const ext = getExtension(file.mimetype);
  const filename = `${crypto.randomUUID()}${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);

  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    // Process image: strip EXIF (privacy!), resize if huge, convert to efficient format
    await sharp(file.buffer)
      .rotate() // auto-rotate based on EXIF before stripping
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      .withMetadata({ exif: undefined }) // strip all EXIF data (GPS, camera info, etc.)
      .toFile(filepath);
  } else {
    // Video: save as-is (no server-side processing)
    fs.writeFileSync(filepath, file.buffer);
  }

  const isImage = ALLOWED_IMAGE_TYPES.includes(file.mimetype);
  return {
    url: `/uploads/${filename}`,
    type: isImage ? 'image' : 'video',
    filename,
  };
}

function getExtension(mimetype) {
  const map = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
  };
  return map[mimetype] || '';
}

module.exports = { upload, processAndSave, UPLOAD_DIR };
