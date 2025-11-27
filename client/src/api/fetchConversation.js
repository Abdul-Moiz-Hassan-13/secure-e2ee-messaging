import axiosClient from "./axiosClient";
import { decryptMessage } from "../crypto/encryption";

export async function getDecryptedConversation(sessionKey, userId, peerId) {
  // 1. Fetch encrypted messages
  const response = await axiosClient.get(
    `/messages/conversation/${userId}/${peerId}`
  );

  const encryptedMessages = response.data;

  // 2. Decrypt each message
  const decrypted = [];

  for (const msg of encryptedMessages) {
    try {
      const plaintext = await decryptMessage(
        sessionKey,
        msg.ciphertext,
        msg.iv
      );

      decrypted.push({
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        plaintext,
        timestamp: msg.timestamp
      });

    } catch (err) {
      console.error("Decryption failed for message:", msg._id, err);
      // optional: skip or push error object
    }
  }

  return decrypted;
}
