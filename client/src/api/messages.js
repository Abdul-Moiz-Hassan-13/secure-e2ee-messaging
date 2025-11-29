import axiosClient from "./axiosClient";
import { encryptMessage } from "../crypto/encryption";

function generateNonce() {
  return crypto.randomUUID();
}

const sequenceMap = {};

export async function sendEncryptedMessage(sessionKey, senderId, receiverId, plaintext) {
  const { ciphertext, iv } = await encryptMessage(sessionKey, plaintext);

  const conversationId = [senderId, receiverId].sort().join("_");

  if (!sequenceMap[conversationId]) {
    sequenceMap[conversationId] = 1;
  } else {
    sequenceMap[conversationId] += 1;
  }

  const sequenceNumber = sequenceMap[conversationId];

  const nonce = generateNonce();

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
