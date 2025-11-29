export async function generateEphemeralECDHKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "ECDH",
      namedCurve: "P-256"
    },
    true,
    ["deriveKey", "deriveBits"]
  );

  return keyPair;
}

export async function exportEphemeralPublicKey(publicKey) {
  const jwk = await window.crypto.subtle.exportKey("jwk", publicKey);
  return jwk;
}
