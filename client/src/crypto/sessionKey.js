export async function importPeerEphemeralPublicKey(jwk) {
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    true,
    []
  );
}

export async function deriveSharedSecret(myEphemeralPrivateKey, peerEphemeralPublicKey) {
  const sharedSecret = await window.crypto.subtle.deriveBits(
    {
      name: "ECDH",
      public: peerEphemeralPublicKey
    },
    myEphemeralPrivateKey,
    256
  );

  return sharedSecret;
}

export async function deriveSessionKey(sharedSecret, saltString = "", infoString = "chat-session") {
  const hkdfBaseKey = await window.crypto.subtle.importKey(
    "raw",
    sharedSecret,
    { name: "HKDF" },
    false,
    ["deriveKey"]
  );

  const saltBytes = new TextEncoder().encode(saltString);
  const infoBytes = new TextEncoder().encode(infoString);

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
    false,
    ["encrypt", "decrypt"]
  );

  return sessionKey;
}

export async function generateSessionKey(myEphemeralPrivateKey, peerEphemeralPublicJwk, saltString = "") {
  const peerPublicKey = await importPeerEphemeralPublicKey(peerEphemeralPublicJwk);

  const sharedSecret = await deriveSharedSecret(
    myEphemeralPrivateKey,
    peerPublicKey
  );

  const sessionKey = await deriveSessionKey(
    sharedSecret,
    saltString,
    "chat-session"
  );

  return sessionKey;
}
