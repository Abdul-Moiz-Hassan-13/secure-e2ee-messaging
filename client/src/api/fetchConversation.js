import axiosClient from "./axiosClient";
import { decryptMessage } from "../crypto/encryption";

export async function getDecryptedConversation(sessionKey, userId, peerId) {
  const response = await axiosClient.get(
    `/messages/conversation/${userId}/${peerId}`
  );

  const encryptedMessages = response.data;
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
        timestamp: msg.timestamp,
        _id: msg._id
      });

    } catch (err) {
      // Skip messages that fail to decrypt (from previous sessions with different keys)
      console.log("Skipping message (encrypted in previous session):", msg._id);
    }
  }

  return decrypted;
}
