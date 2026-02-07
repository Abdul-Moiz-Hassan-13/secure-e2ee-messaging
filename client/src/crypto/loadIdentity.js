export async function loadIdentityKeyPair(userId) {
  const priv = localStorage.getItem(`identity_private_${userId}`);
  if (!priv) {
    console.log(`No private key found for user ${userId}`);
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
  // First try local storage (for own keys)
  const pub = localStorage.getItem(`identity_public_${userId}`);
  if (pub) {
    const jwk = JSON.parse(pub);
    return jwk;
  }

  // If not in local storage, fetch from server (other users' keys)
  try {
    const response = await import("../api/axiosClient.js").then(m => m.default.get(`/users/${userId}`));
    if (response.data && response.data.publicIdentityKey) {
      console.log(`Fetched public key for user ${userId} from server`);
      return response.data.publicIdentityKey;
    }
  } catch (err) {
    console.error(`Failed to fetch public key for user ${userId}:`, err);
  }

  console.log(`No public key found for user ${userId}`);
  return null;
}