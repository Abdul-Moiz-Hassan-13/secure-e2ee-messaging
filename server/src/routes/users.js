import express from 'express';
import User from '../models/User.js';
import { logSecurity } from "../utils/securityLogger.js";

const router = express.Router();

// =========================
// GET /api/users
// =========================
router.get('/', async (req, res) => {
  try {

    // Log metadata access request
    logSecurity(
      "METADATA_ACCESS",
      "User list requested",
      null,
      { route: "/api/users" },
      req
    );

    const users = await User.find({}, {
      username: 1,
      publicIdentityKey: 1
    });

    // Log success
    logSecurity(
      "METADATA_RETURNED",
      "User list returned successfully",
      null,
      { count: users.length },
      req
    );

    res.json(users);

  } catch (err) {

    logSecurity(
      "METADATA_ERROR",
      "Error fetching user list",
      null,
      { error: err.message },
      req
    );

    console.error("Get users error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// =========================
// GET /api/users/:id
// =========================
router.get('/:id', async (req, res) => {
  try {

    // Log metadata access request
    logSecurity(
      "METADATA_ACCESS",
      "Specific user metadata requested",
      req.params.id,
      { route: `/api/users/${req.params.id}` },
      req
    );

    const user = await User.findById(req.params.id, {
      username: 1,
      publicIdentityKey: 1
    });

    if (!user) {

      logSecurity(
        "METADATA_NOT_FOUND",
        "Requested user does not exist",
        req.params.id,
        {},
        req
      );

      return res.status(404).json({ error: "User not found" });
    }

    // Log successful return
    logSecurity(
      "METADATA_RETURNED",
      "User metadata returned",
      req.params.id,
      { username: user.username },
      req
    );

    res.json(user);

  } catch (err) {

    logSecurity(
      "METADATA_ERROR",
      "Error fetching specific user metadata",
      req.params.id,
      { error: err.message },
      req
    );

    console.error("Get user by id error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
