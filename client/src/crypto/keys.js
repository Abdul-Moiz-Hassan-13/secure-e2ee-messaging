export async function generateIdentityKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign", "verify"]
  );

  // You must export the public key, because CryptoKey cannot be stored directly.
  const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);

  return {
    privateKey: keyPair.privateKey,
    publicKey: keyPair.publicKey,
    publicKeyJwk
  };
}

export async function saveIdentityKeyPair(userId, { privateKey, publicKeyJwk }) {
  const privJwk = await window.crypto.subtle.exportKey("jwk", privateKey);

  // Add user ID to storage keys
  localStorage.setItem(`identity_private_${userId}`, JSON.stringify(privJwk));
  localStorage.setItem(`identity_public_${userId}`, JSON.stringify(publicKeyJwk));
  
  console.log(`✅ Identity keys saved for user ${userId}`);
}

export async function exportPublicKey(key) {
  return await window.crypto.subtle.exportKey("jwk", key);
}
