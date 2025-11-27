import express from "express";
import multer from "multer";
import FileRecord from "../models/FileRecord.js";
import ReplayState from "../models/ReplayState.js";

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
      sequenceNumber
    } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "Missing encrypted file" });
    }

    // -------------------------
    // 🔥 REPLAY ATTACK CHECKS
    // -------------------------

    let state = await ReplayState.findOne({ userId: senderId });

    if (!state) {
      state = await ReplayState.create({
        userId: senderId,
        lastSequence: 0,
        usedNonces: []
      });
    }

    // 1. Nonce already used?
    if (state.usedNonces.includes(nonce)) {
      console.log("⚠ Replay detected: nonce reused");
      return res.status(400).json({ error: "Replay attack detected (nonce reused)" });
    }

    // 2. Sequence number must strictly increase
    if (Number(sequenceNumber) <= state.lastSequence) {
      console.log("⚠ Replay detected: sequence rollback");
      return res.status(400).json({ error: "Replay attack detected (sequence rollback)" });
    }

    // Update state
    state.usedNonces.push(nonce);
    state.lastSequence = Number(sequenceNumber);
    await state.save();

    // -------------------------
    // 📁 Normal file save
    // -------------------------
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

// GET /api/files/download/:id
router.get("/download/:id", async (req, res) => {
  try {
    const fileRecord = await FileRecord.findById(req.params.id);

    if (!fileRecord) {
      return res.status(404).json({ error: "File not found" });
    }

    res.json({
      filename: fileRecord.filename,
      ciphertext: fileRecord.encryptedFile.toString("base64"),
      iv: fileRecord.iv,
      nonce: fileRecord.nonce,
      sequenceNumber: fileRecord.sequenceNumber,
      mimeType: "application/octet-stream"
    });

  } catch (err) {
    console.error("File download error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
