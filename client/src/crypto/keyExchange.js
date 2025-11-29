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
  const identityPrivateKey = await loadIdentityKeyPair();
  const identityPublicJwk = await loadPublicIdentityKey();

  if (!identityPrivateKey || !identityPublicJwk) {
    throw new Error("Identity keys not found. Make sure user is registered on this device.");
  }

  // Conversation-scoped persistent storage
  const conversationId = buildConversationId(fromUserId, toUserId);
  const privKeyTag = `ephem_priv_${conversationId}`;
  const pubKeyTag  = `ephem_pub_${conversationId}`;

  // Try to reuse existing ephemeral private key
  let ephemeralPrivate = await loadEphemeralPrivateKey(conversationId);
  let ephemeralPubJwk = localStorage.getItem(pubKeyTag);

  if (!ephemeralPrivate || !ephemeralPubJwk) {
    // First-time key exchange → generate new pair
    const ephemeral = await generateEphemeralECDHKeyPair();
    ephemeralPrivate = ephemeral.privateKey;

    ephemeralPubJwk = await exportEphemeralPublicKey(ephemeral.publicKey);

    // Persist for later finalization
    await saveEphemeralPrivateKey(conversationId, ephemeralPrivate);
    localStorage.setItem(pubKeyTag, JSON.stringify(ephemeralPubJwk));
  } else {
    // Convert stored JSON back to object
    ephemeralPubJwk = JSON.parse(ephemeralPubJwk);
  }

  // Build the KEY_INIT payload
  const payload = {
    type: "KEY_INIT",
    from: fromUserId,
    to: toUserId,
    alice_identity_public: identityPublicJwk,
    alice_ephemeral_public: ephemeralPubJwk,
    timestamp: Date.now(),
    nonce: crypto.randomUUID(),
    sequence: 1,
  };

  const signature = await signPayload(identityPrivateKey, payload);
  payload.signature = signature;

  const response = await axios.post("/keyexchange/init", {
    from: fromUserId,
    to: toUserId,
    payload,
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
  const conversationId = buildConversationId(myUserId, peerUserId);

  const aliceEphemeralPrivate = await loadEphemeralPrivateKey(conversationId);
  if (!aliceEphemeralPrivate) {
    throw new Error("Ephemeral private key for initiator not found. Did you call sendKeyInit?");
  }

  // 2) Fetch latest KEY_CONFIRM from Bob -> Alice, with a few retries
  let record = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const confirmRes = await axios.get(
        `/keyexchange/confirm/${peerUserId}/${myUserId}`
      );
      record = confirmRes.data;
      break; // got it 🎉
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404 && attempt < 4) {
        // Bob hasn't written KEY_CONFIRM yet – wait a bit and retry
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }
      // other errors or last attempt -> rethrow
      throw err;
    }
  }

  if (!record) {
    throw new Error("KEY_CONFIRM still not available after retries.");
  }

  const payload = record.payload;
  const { signature, ...unsignedPayload } = payload;

  const bobIdentityPublicJwk = payload.bob_identity_public;

  const isValid = await verifyPayload(
    bobIdentityPublicJwk,
    unsignedPayload,
    signature
  );

  if (!isValid) {
    throw new Error("Invalid KEY_CONFIRM signature from peer (possible MITM).");
  }

  const sessionKey = await generateSessionKey(
    aliceEphemeralPrivate,
    payload.bob_ephemeral_public,
    conversationId
  );

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


