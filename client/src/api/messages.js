import axiosClient from "./axiosClient";
import { encryptMessage } from "../crypto/encryption";
import { buildConversationId } from "../crypto/sessionKey";

function generateNonce() {
  return crypto.randomUUID();
}

// NEW — Get sequence number from server first
async function getNextSequence(senderId, receiverId) {
  try {
    // Fetch current conversation state from server
    const response = await axiosClient.get(
      `/messages/conversation/${senderId}/${receiverId}`
    );
    
    // Extract the last sequence number from server response
    // Adjust this line based on your actual API response structure:
    const lastSequence = response.data.lastSequence || 
                        response.data.metadata?.lastSequence || 
                        0;
    
    // Increment for the new message
    const nextSequence = lastSequence + 1;
    
    // Optional: Update localStorage to keep track locally
    const convId = buildConversationId(senderId, receiverId);
    const key = `seq_${convId}_${senderId}`;
    localStorage.setItem(key, nextSequence.toString());
    
    return nextSequence;
  } catch (error) {
    console.error("Failed to get sequence from server:", error);
    // Fallback: use localStorage but with a much higher number
    const convId = buildConversationId(senderId, receiverId);
    const key = `seq_${convId}_${senderId}`;
    let last = Number(localStorage.getItem(key) || 1764438148389); // Start from server's last known
    last += 1;
    localStorage.setItem(key, last);
    return last;
  }
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