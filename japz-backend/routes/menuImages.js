import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { MenuItem } from "../models/menuItemModel.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Uploads live under the folder index.js already serves statically, so an
// uploaded photo is reachable at /uploads/menu/<file>.
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "menu");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/** Staff only. Customers must never be able to write files to the server. */
const verifyStaff = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!['admin', 'cashier', 'kitchen'].includes(decoded.role)) {
      return res.status(403).json({ error: 'Staff access only.' });
    }
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const ALLOWED = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      // Random name, extension derived from the checked mimetype — never from
      // the client's filename, which could carry a misleading extension.
      const ext = ALLOWED[file.mimetype] || '.jpg';
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED[file.mimetype]) {
      return cb(new Error('Only JPG, PNG or WebP images are allowed.'));
    }
    cb(null, true);
  },
});

/** Replaces the photo for one menu item. */
router.post("/api/menu-items/:id/image", verifyStaff, (req, res) => {
  upload.single('image')(req, res, async (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'That image is larger than 4MB. Please use a smaller one.'
        : err.message || 'Upload failed.';
      return res.status(400).json({ error: message });
    }
    if (!req.file) return res.status(400).json({ error: 'No image received.' });

    try {
      const item = await MenuItem.findByPk(req.params.id);
      if (!item) {
        fs.unlink(req.file.path, () => {});
        return res.status(404).json({ error: 'Menu item not found.' });
      }

      const previous = item.imageUrl;
      const imageUrl = `/uploads/menu/${req.file.filename}`;
      await item.update({ imageUrl });

      // Remove the old file, but only if it is one of ours — never touch the
      // bundled category images or anything outside the upload folder.
      if (previous && previous.startsWith('/uploads/menu/')) {
        const oldPath = path.join(process.cwd(), 'public', previous.replace(/^\//, ''));
        if (path.resolve(oldPath).startsWith(path.resolve(UPLOAD_DIR))) {
          fs.unlink(oldPath, () => {});
        }
      }

      res.json({ imageUrl });
    } catch (error) {
      fs.unlink(req.file.path, () => {});
      res.status(500).json({ error: error.message });
    }
  });
});

/** Clears the photo, falling the item back to its category image. */
router.delete("/api/menu-items/:id/image", verifyStaff, async (req, res) => {
  try {
    const item = await MenuItem.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Menu item not found.' });

    const previous = item.imageUrl;
    await item.update({ imageUrl: null });

    if (previous && previous.startsWith('/uploads/menu/')) {
      const oldPath = path.join(process.cwd(), 'public', previous.replace(/^\//, ''));
      if (path.resolve(oldPath).startsWith(path.resolve(UPLOAD_DIR))) {
        fs.unlink(oldPath, () => {});
      }
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
