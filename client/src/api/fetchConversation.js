import axiosClient from "./axiosClient";
import { decryptMessage } from "../crypto/encryption";
import { buildConversationId, loadSessionKeyByVersion, getCurrentKeyVersion } from "../crypto/sessionKey";

export async function getDecryptedConversation(sessionKey, userId, peerId) {
  const response = await axiosClient.get(
    `/messages/conversation/${userId}/${peerId}`
  );

  const encryptedMessages = response.data;
  const decrypted = [];
  
  const convId = buildConversationId(userId, peerId);
  const currentVersion = await getCurrentKeyVersion(convId);
  
  console.log(`[DECRYPT] Current key version: ${currentVersion}, Messages to decrypt: ${encryptedMessages.length}`);

  for (const msg of encryptedMessages) {
    let success = false;

    // Try to decrypt with the message's specific key version first
    if (msg.keyVersion && msg.keyVersion !== currentVersion) {
      try {
        console.log(`Trying to decrypt message ${msg._id} with key version ${msg.keyVersion}`);
        const versionedKey = await loadSessionKeyByVersion(convId, msg.keyVersion);
        
        if (versionedKey) {
          const plaintext = await decryptMessage(
            versionedKey,
            msg.ciphertext,
            msg.iv
          );

          decrypted.push({
            senderId: msg.senderId,
            receiverId: msg.receiverId,
            plaintext,
            timestamp: msg.timestamp,
            _id: msg._id,
            keyVersion: msg.keyVersion
          });
          
          success = true;
          console.log(`✓ Decrypted with historical key version ${msg.keyVersion}`);
        } else {
          console.log(`Key version ${msg.keyVersion} not found in history`);
        }
      } catch (err) {
        console.log(`Failed to decrypt with version ${msg.keyVersion}:`, err.message);
      }
    }

    // If that didn't work, try current key
    if (!success) {
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
          _id: msg._id,
          keyVersion: msg.keyVersion || currentVersion
        });
        
        success = true;
        console.log(`✓ Decrypted message ${msg._id} with current key (version ${currentVersion})`);
      } catch (err) {
        console.log(`Current key failed for message ${msg._id}:`, err.message);
      }
    }

    // If all attempts failed, message is lost (PFS working as intended)
    if (!success) {
      console.warn(`⚠️ Message ${msg._id} could not be decrypted - key may have been rotated or lost`);
    }
  }

  console.log(`[DECRYPT] Successfully decrypted ${decrypted.length}/${encryptedMessages.length} messages`);
  return decrypted;
}
