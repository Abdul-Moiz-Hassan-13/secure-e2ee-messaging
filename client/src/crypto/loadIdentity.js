export async function loadIdentityKeyPair(userId) {
  const priv = localStorage.getItem(`identity_private_${userId}`);
  if (!priv) {
    console.log(`❌ No private key found for user ${userId}`);
    return null;
  }

  const jwk = JSON.parse(priv);
  return await window.crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign"]
  );
}

export async function loadPublicIdentityKey(userId) {
  const pub = localStorage.getItem(`identity_public_${userId}`);
  if (!pub) {
    console.log(`❌ No public key found for user ${userId}`);
    return null;
  }

  const jwk = JSON.parse(pub);
  return jwk;
}