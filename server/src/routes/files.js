import express from "express";
import multer from "multer";
import FileRecord from "../models/FileRecord.js";

const router = express.Router();

// Multer storage in memory — perfect for encrypted files
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/files/upload
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const {
      senderId,
      receiverId,
      filename,
      iv,
      nonce,
      sequenceNumber,
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "Missing encrypted file" });
    }

    const encryptedBuffer = req.file.buffer;

    const saved = await FileRecord.create({
      senderId,
      receiverId,
      filename,
      encryptedFile: encryptedBuffer,
      iv,
      nonce,
      sequenceNumber,
    });

    res.json({ message: "Encrypted file stored", id: saved._id });

  } catch (err) {
    console.error("File upload error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
