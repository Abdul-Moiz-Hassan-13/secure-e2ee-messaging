// Import peer's ephemeral ECDH public key (JWK → CryptoKey)
export async function importPeerEphemeralPublicKey(jwk) {
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    true,
    [] // no key usages needed for public key import
  );
}

// Derive the raw ECDH shared secret (ArrayBuffer)
export async function deriveSharedSecret(myEphemeralPrivateKey, peerEphemeralPublicKey) {
  const sharedSecret = await window.crypto.subtle.deriveBits(
    {
      name: "ECDH",
      public: peerEphemeralPublicKey
    },
    myEphemeralPrivateKey,
    256 // produce a 256-bit shared secret
  );

  return sharedSecret;
}

// Derive AES-256-GCM session key using HKDF over the shared secret
export async function deriveSessionKey(sharedSecret, saltString = "", infoString = "chat-session") {
  // Import raw shared secret for HKDF
  const hkdfBaseKey = await window.crypto.subtle.importKey(
    "raw",
    sharedSecret,
    { name: "HKDF" },
    false,
    ["deriveKey"]
  );

  const saltBytes = new TextEncoder().encode(saltString);
  const infoBytes = new TextEncoder().encode(infoString);

  // HKDF → AES-256-GCM
  const sessionKey = await window.crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: saltBytes,
      info: infoBytes
    },
    hkdfBaseKey,
    {
      name: "AES-GCM",
      length: 256
    },
    false, // session key should NOT be extractable for security
    ["encrypt", "decrypt"]
  );

  return sessionKey;
}

// High-level helper: from my private ECDH key + peer public JWK → AES-GCM key
export async function generateSessionKey(myEphemeralPrivateKey, peerEphemeralPublicJwk, saltString = "") {
  // Convert peer's JWK → CryptoKey
  const peerPublicKey = await importPeerEphemeralPublicKey(peerEphemeralPublicJwk);

  // Get the shared secret from ECDH
  const sharedSecret = await deriveSharedSecret(
    myEphemeralPrivateKey,
    peerPublicKey
  );

  // HKDF → AES-256-GCM session key
  const sessionKey = await deriveSessionKey(
    sharedSecret,
    saltString,
    "chat-session"
  );

  return sessionKey;
}
