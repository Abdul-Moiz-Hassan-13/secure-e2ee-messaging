import axiosClient from "./axiosClient";
import { encryptMessage } from "../crypto/encryption";
import { buildConversationId, getCurrentKeyVersion } from "../crypto/sessionKey";

function generateNonce() {
  return crypto.randomUUID();
}

async function getNextSequence(senderId, receiverId) {
  const convId = buildConversationId(senderId, receiverId);
  const key = `seq_${convId}_${senderId}`;
  
  let current = Number(localStorage.getItem(key) || 1000);
  current += 1;
  
  localStorage.setItem(key, current.toString());
  console.log(`Sequence for ${senderId}: ${current}`);
  return current;
}

export async function sendEncryptedMessage(sessionKey, senderId, receiverId, plaintext, clientTimestamp) {
  const { ciphertext, iv } = await encryptMessage(sessionKey, plaintext);

  const sequenceNumber = await getNextSequence(senderId, receiverId);
  const nonce = crypto.randomUUID();
  
  // Get current key version for this conversation
  const convId = buildConversationId(senderId, receiverId);
  const keyVersion = await getCurrentKeyVersion(convId);

  console.log("[SEND MESSAGE] Payload values:", {
    senderId: senderId,
    receiverId: receiverId,
    ciphertext: ciphertext.substring(0, 20) + "...",
    iv: iv.substring(0, 20) + "...",
    nonce: nonce,
    sequenceNumber: sequenceNumber,
    clientTimestamp: clientTimestamp,
    keyVersion: keyVersion
  });

  const response = await axiosClient.post("/messages/send", {
    senderId,
    receiverId,
    ciphertext,
    iv,
    nonce,
    sequenceNumber,
    clientTimestamp,
    keyVersion
  });

  return response.data;
}