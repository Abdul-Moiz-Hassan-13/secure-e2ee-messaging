import axios from "../api/axiosClient";

import {
  generateEphemeralECDHKeyPair,
  exportEphemeralPublicKey,
  saveEphemeralPrivateKey,
  loadEphemeralPrivateKey,
} from "./session";

import {
  loadIdentityKeyPair,
  loadPublicIdentityKey,
} from "./loadIdentity";

import { generateSessionKey, loadSessionKeyForUsers } from "./sessionKey";

import { signPayload, verifyPayload } from "./signature";

import {
  buildConversationId,
  saveSessionKey,
} from "./sessionKey";

export async function sendKeyInit(fromUserId, toUserId) {
  // 1) Load identity keys (ECDSA)
  const identityPrivateKey = await loadIdentityKeyPair();   // signing key
  const identityPublicJwk = await loadPublicIdentityKey();  // public JWK

  if (!identityPrivateKey || !identityPublicJwk) {
    throw new Error("Identity keys not found. Make sure user is registered on this device.");
  }

  // 2) Generate ephemeral ECDH key pair for this conversation
  const ephemeral = await generateEphemeralECDHKeyPair();
  const ephemeralPubJwk = await exportEphemeralPublicKey(ephemeral.publicKey);

  // 3) Build a stable conversation ID and store the ephemeral private key
  const conversationId = buildConversationId(fromUserId, toUserId);
  await saveEphemeralPrivateKey(conversationId, ephemeral.privateKey);

  // 4) Build the signed KEY_INIT payload
  const payload = {
    type: "KEY_INIT",
    from: fromUserId,
    to: toUserId,
    alice_identity_public: identityPublicJwk,
    alice_ephemeral_public: ephemeralPubJwk,
    timestamp: Date.now(),
    nonce: crypto.randomUUID(),
    sequence: 1
  };

  const signature = await signPayload(identityPrivateKey, payload);

  payload.signature = signature;

  // 5) Send to backend keyexchange route
  const response = await axios.post("/keyexchange/init", {
    from: fromUserId,
    to: toUserId,
    payload
  });

  return response.data;
}

// --- Bob side: respond to KEY_INIT, derive session key, and send KEY_CONFIRM ---

export async function respondToKeyInitAndDeriveSessionKey(myUserId, peerUserId) {
  // myUserId = Bob, peerUserId = Alice
  const conversationId = buildConversationId(myUserId, peerUserId);

  // 1) Load latest KEY_INIT from peer -> me
  const initRes = await axios.get(`/keyexchange/init/${peerUserId}/${myUserId}`);
  const record = initRes.data;
  const payload = record.payload;

  // 2) Separate signature and original payload
  const { signature, ...unsignedPayload } = payload;

  // 3) Verify Alice's signature using her identity public key from payload
  const aliceIdentityPublicJwk = payload.alice_identity_public;

  const isValid = await verifyPayload(
    aliceIdentityPublicJwk,
    unsignedPayload,
    signature
  );

  if (!isValid) {
    throw new Error("Invalid KEY_INIT signature from peer (possible MITM).");
  }

  // 4) Generate Bob's ephemeral ECDH key pair
  const ephBob = await generateEphemeralECDHKeyPair();
  const ephBobPubJwk = await exportEphemeralPublicKey(ephBob.publicKey);

  // 5) Derive shared session key using Bob's ephemeral private + Alice's ephemeral public
  const sessionKey = await generateSessionKey(
    ephBob.privateKey,
    payload.alice_ephemeral_public,
    conversationId // used as salt string for HKDF
  );

  // 6) Store session key for this conversation locally
  await saveSessionKey(conversationId, sessionKey);

  // (Optional) You could also store Bob's ephemeral private key if you wanted to re-derive later
  // but it's not strictly necessary once the session key is derived.

  // 7) Load Bob's identity keys to sign KEY_CONFIRM
  const bobIdentityPrivateKey = await loadIdentityKeyPair();
  const bobIdentityPublicJwk = await loadPublicIdentityKey();

  if (!bobIdentityPrivateKey || !bobIdentityPublicJwk) {
    throw new Error("Bob's identity keys not found on this device.");
  }

  // 8) Build KEY_CONFIRM payload
  const confirmPayload = {
    type: "KEY_CONFIRM",
    from: myUserId,          // Bob
    to: peerUserId,          // Alice
    bob_identity_public: bobIdentityPublicJwk,
    bob_ephemeral_public: ephBobPubJwk,
    // include Alice's ephemeral public again for binding / context
    alice_ephemeral_public: payload.alice_ephemeral_public,
    timestamp: Date.now(),
    nonce: crypto.randomUUID(),
    sequence: 2,
  };

  const confirmSignature = await signPayload(bobIdentityPrivateKey, confirmPayload);
  confirmPayload.signature = confirmSignature;

  // 9) Send KEY_CONFIRM back to Alice
  await axios.post("/keyexchange/confirm", {
    from: myUserId,
    to: peerUserId,
    payload: confirmPayload,
  });

  return { conversationId, sessionKey };
}

// --- Alice side: after she has sent KEY_INIT, finalize session key using KEY_CONFIRM ---

export async function finalizeInitiatorSessionKey(myUserId, peerUserId) {
  // myUserId = Alice, peerUserId = Bob
  const conversationId = buildConversationId(myUserId, peerUserId);

  // 1) Load Alice's ephemeral private key for this conversation
  const aliceEphemeralPrivate = await loadEphemeralPrivateKey(conversationId);
  if (!aliceEphemeralPrivate) {
    throw new Error("Ephemeral private key for initiator not found. Did you call sendKeyInit?");
  }

  // 2) Fetch latest KEY_CONFIRM from Bob -> Alice
  const confirmRes = await axios.get(`/keyexchange/confirm/${peerUserId}/${myUserId}`);
  const record = confirmRes.data;
  const payload = record.payload;

  // 3) Separate signature and payload without signature
  const { signature, ...unsignedPayload } = payload;

  // 4) Verify Bob's signature using his identity public key from payload
  const bobIdentityPublicJwk = payload.bob_identity_public;

  const isValid = await verifyPayload(
    bobIdentityPublicJwk,
    unsignedPayload,
    signature
  );

  if (!isValid) {
    throw new Error("Invalid KEY_CONFIRM signature from peer (possible MITM).");
  }

  // 5) Derive the same session key using Alice's ephemeral private + Bob's ephemeral public
  const sessionKey = await generateSessionKey(
    aliceEphemeralPrivate,
    payload.bob_ephemeral_public,
    conversationId // same salt as Bob used
  );

  // 6) Store the session key locally
  await saveSessionKey(conversationId, sessionKey);

  return { conversationId, sessionKey };
}

// --- High-level helper: ensure a session key exists for (myUserId, peerUserId) ---

/**
 * Ensure there is an AES session key for a conversation between myUserId and peerUserId.
 * If one already exists in localStorage, it is loaded and returned.
 * Otherwise:
 *  - The "initiator" (lexicographically smaller userId) sends KEY_INIT and tries to finalize.
 *  - The "responder" tries to respond to KEY_INIT and derive the session key.
 *
 * NOTE: This is a simple version:
 *  - It assumes the peer will eventually respond.
 *  - It may throw if KEY_INIT / KEY_CONFIRM are not yet available.
 */
export async function ensureSessionKeyForUsers(myUserId, peerUserId) {
  // 1) If a session key already exists, just return it
  const existing = await loadSessionKeyForUsers(myUserId, peerUserId);
  if (existing) {
    return existing;
  }

  // 2) Decide who is initiator vs responder in a deterministic way
  const myIdStr = String(myUserId);
  const peerIdStr = String(peerUserId);
  const amInitiator = myIdStr < peerIdStr; // "smaller" ID is initiator

  if (amInitiator) {
    // --- Alice side: initiator ---
    // a) Send KEY_INIT (store my ephemeral private key)
    await sendKeyInit(myUserId, peerUserId);

    // b) Try to finalize using KEY_CONFIRM (Bob must have responded)
    try {
      const { sessionKey } = await finalizeInitiatorSessionKey(myUserId, peerUserId);
      return sessionKey;
    } catch (err) {
      console.warn("[KeyExchange] Initiator could not finalize session key yet. Peer may not have responded.", err);
      throw err;
    }

  } else {
    // --- Bob side: responder ---
    try {
      const { sessionKey } = await respondToKeyInitAndDeriveSessionKey(myUserId, peerUserId);
      return sessionKey;
    } catch (err) {
      console.warn("[KeyExchange] Responder could not derive session key. KEY_INIT may not be available yet.", err);
      throw err;
    }
  }
}


