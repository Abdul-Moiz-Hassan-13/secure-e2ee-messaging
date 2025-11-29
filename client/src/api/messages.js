import axiosClient from "./axiosClient";
import { encryptMessage } from "../crypto/encryption";
import { buildConversationId } from "../crypto/sessionKey";

function generateNonce() {
  return crypto.randomUUID();
}

async function getNextSequence(senderId, receiverId) {
  const convId = buildConversationId(senderId, receiverId);
  const key = `seq_${convId}_${senderId}`;
  
  // Start from a high number to avoid conflicts
  let current = Number(localStorage.getItem(key) || 1000);
  current += 1;
  
  localStorage.setItem(key, current.toString());
  console.log(`🔢 Sequence for ${senderId}: ${current}`);
  return current;
}

export async function sendEncryptedMessage(sessionKey, senderId, receiverId, plaintext, clientTimestamp) {
  const { ciphertext, iv } = await encryptMessage(sessionKey, plaintext);

  // FIXED: Get sequence number from server first
  const sequenceNumber = await getNextSequence(senderId, receiverId);

  const response = await axiosClient.post("/messages/send", {
    senderId,
    receiverId,
    ciphertext,
    iv,
    nonce: crypto.randomUUID(),
    sequenceNumber,
    clientTimestamp
  });

  return response.data;
}