import SecurityLog from "../models/SecurityLog.js";

export async function logSecurity(eventType, message, userId = null, details = {}, req = null) {
  const ip = req ? req.ip : null;

  console.log(`[SECURITY] ${eventType}: ${message}`, details);

  try {
    await SecurityLog.create({
      eventType,
      message,
      userId,
      ip,
      details
    });
  } catch (err) {
    console.error("Failed to store security log:", err);
  }
}
