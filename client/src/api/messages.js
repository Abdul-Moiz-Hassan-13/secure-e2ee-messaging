import axiosClient from "./axiosClient";
import { encryptMessage } from "../crypto/encryption";

// Build a random nonce for replay protection
function generateNonce() {
  return crypto.randomUUID();
}

// Sequence number per conversation (temporary local store)
const sequenceMap = {}; // { conversationId: sequenceNumber }

export async function sendEncryptedMessage(sessionKey, senderId, receiverId, plaintext) {
  // Step 1 — Encrypt the plaintext
  const { ciphertext, iv } = await encryptMessage(sessionKey, plaintext);

  // Step 2 — Build conversationId (sorted so order doesn't matter)
  const conversationId = [senderId, receiverId].sort().join("_");

  // Step 3 — Increment sequence number
  if (!sequenceMap[conversationId]) {
    sequenceMap[conversationId] = 1;
  } else {
    sequenceMap[conversationId] += 1;
  }

  const sequenceNumber = sequenceMap[conversationId];

  // Step 4 — Generate nonce
  const nonce = generateNonce();

  // Step 5 — POST to backend
  const response = await axiosClient.post("/messages/send", {
    senderId,
    receiverId,
    ciphertext,
    iv,
    nonce,
    sequenceNumber
  });

  return response.data;
}
