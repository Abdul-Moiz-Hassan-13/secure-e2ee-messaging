import express from 'express';
import User from '../models/User.js';

const router = express.Router();

// GET /api/users
// Return list of users with public identity keys (no passwords)
router.get('/', async (req, res) => {
  try {
    const users = await User.find({}, {
      username: 1,
      publicIdentityKey: 1
    });

    res.json(users);
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/users/:id
// Return public identity key for a specific user
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id, {
      username: 1,
      publicIdentityKey: 1
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Get user by id error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
