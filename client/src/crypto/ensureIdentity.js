import {
  loadIdentityKeyPair,
  loadPublicIdentityKey,
} from "./loadIdentity";

import { generateIdentityKeyPair, saveIdentityKeyPair } from "./keys";

export async function ensureIdentityKeysExist(userId) {
  const privateKey = await loadIdentityKeyPair(userId); // Pass userId
  const publicKey = await loadPublicIdentityKey(userId); // Pass userId
  
  if (privateKey && publicKey) {
    console.log(`✅ Identity keys found for user ${userId}`);
    return;
  }

  console.warn(`[Identity] No identity keys for ${userId}. Generating...`);
  const { privateKey: newPriv, publicKeyJwk } = await generateIdentityKeyPair();
  await saveIdentityKeyPair(userId, { privateKey: newPriv, publicKeyJwk }); // Pass userId
  console.log("[Identity] Identity keys created and saved.");
}
