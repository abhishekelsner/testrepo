import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { authenticate } from '../auth/auth.middleware.js';
import { Image } from './image.model.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../../../../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Only image files are allowed'));
  },
});

const router = Router();

// POST /api/images/upload
router.post('/upload', authenticate, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const url = `${baseUrl}/uploads/${req.file.filename}`;

    const image = await Image.create({
      userId: req.userId,
      organizationId: req.organizationId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url,
    });

    res.status(201).json({ image });
  } catch (err) {
    next(err);
  }
});

// GET /api/images
router.get('/', authenticate, async (req, res, next) => {
  try {
    const images = await Image.find({ userId: req.userId }).sort({ createdAt: -1 });

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const result = images.map((img) => ({
      _id: img._id,
      originalName: img.originalName,
      mimeType: img.mimeType,
      size: img.size,
      url: `${baseUrl}/uploads/${img.filename}`,
      createdAt: img.createdAt,
    }));

    res.json({ images: result });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/images/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const image = await Image.findOne({ _id: req.params.id, userId: req.userId });
    if (!image) return res.status(404).json({ error: 'Image not found' });

    const filePath = path.join(uploadsDir, image.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await image.deleteOne();
    res.json({ message: 'Image deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
