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

function keyToBase64(key) {
  return window.crypto.subtle.exportKey("raw", key).then((raw) => {
    const bytes = new Uint8Array(raw);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  });
}

// Helper to verify key consistency
function verifyKeyConsistency(key1, key2, label) {
  if (!key1 || !key2) {
    console.log(`🔑 ${label}: One or both keys are missing`);
    return false;
  }
  const str1 = JSON.stringify(key1);
  const str2 = JSON.stringify(key2);
  const isEqual = str1 === str2;
  console.log(`🔑 ${label} keys equal:`, isEqual);
  if (!isEqual) {
    console.log("KEY1:", key1.x?.substring(0, 20) + "...");
    console.log("KEY2:", key2.x?.substring(0, 20) + "...");
  }
  return isEqual;
}

export async function sendKeyInit(fromUserId, toUserId) {
  const identityPrivateKey = await loadIdentityKeyPair(fromUserId);
  const identityPublicJwk = await loadPublicIdentityKey(fromUserId);

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

  // ADD DEBUG LOGGING HERE
  console.log("🔑 [DEBUG] Alice's stored ephemeral key:", {
    x: ephemeralPubJwk.x?.substring(0, 30),
    y: ephemeralPubJwk.y?.substring(0, 30)
  });

  // Build the KEY_INIT payload
  const payload = {
    type: "KEY_INIT",
    from: fromUserId,
    to: toUserId,
    alice_identity_public: identityPublicJwk,
    alice_ephemeral_public: ephemeralPubJwk, // This should be the SAME as above!
    timestamp: Date.now(),
    nonce: crypto.randomUUID(),
    sequence: 1,
  };

  // ADD DEBUG LOGGING HERE TOO
  console.log("🔑 [DEBUG] Alice's sent ephemeral key:", {
    x: payload.alice_ephemeral_public.x?.substring(0, 30),
    y: payload.alice_ephemeral_public.y?.substring(0, 30)
  });

  const signature = await signPayload(identityPrivateKey, payload);
  payload.signature = signature;

  console.log("🔑 SENDING KEY_INIT with ephemeral public:", ephemeralPubJwk.x?.substring(0, 20) + "...");

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

    // ADD THIS DEBUG LOGGING
  console.log("🔑 [DEBUG] BOB RECEIVED KEY_INIT:");
  console.log("  Ephemeral Key X (first 30 chars):", payload.alice_ephemeral_public?.x?.substring(0, 30));
  console.log("  Ephemeral Key Y (first 30 chars):", payload.alice_ephemeral_public?.y?.substring(0, 30));
  console.log("  Full Key Structure:", JSON.stringify(payload.alice_ephemeral_public).substring(0, 200) + "...");

    // ADD TIMESTAMP DEBUGGING
  console.log("🔑 [DEBUG] Bob received KEY_INIT:");
  console.log("  Key X:", payload.alice_ephemeral_public?.x?.substring(0, 30));
  console.log("  Record timestamp:", record.createdAt);
  console.log("  Current time:", new Date().toISOString());
  
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

  // DEBUG: Log key details
  console.log("🔑 BOB: Generating session key with:", {
    myKeyType: "bobPrivate",
    peerKeyType: "alicePublic", 
    peerKey: payload.alice_ephemeral_public?.x?.substring(0, 20) + "...",
    salt: conversationId
  });

  // 5) Derive shared session key using Bob's ephemeral private + Alice's ephemeral public
  const sessionKey = await generateSessionKey(
    ephBob.privateKey,
    payload.alice_ephemeral_public,
    conversationId
  );

  // 6) Store session key for this conversation locally
  await saveSessionKey(conversationId, sessionKey);

  // 7) Load Bob's identity keys to sign KEY_CONFIRM
  const bobIdentityPrivateKey = await loadIdentityKeyPair(myUserId);
  const bobIdentityPublicJwk = await loadPublicIdentityKey(myUserId);

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

  // ADD DEBUG LOGGING HERE TOO
  console.log("🔑 [DEBUG] Bob sending back Alice's ephemeral key:", {
    x: confirmPayload.alice_ephemeral_public?.x?.substring(0, 30),
    y: confirmPayload.alice_ephemeral_public?.y?.substring(0, 30)
  });

  const confirmSignature = await signPayload(bobIdentityPrivateKey, confirmPayload);
  confirmPayload.signature = confirmSignature;

  console.log("🔑 BOB: Sending KEY_CONFIRM with ephemeral public:", ephBobPubJwk.x?.substring(0, 20) + "...");

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

  console.log("⏳ Initiator: Waiting for KEY_CONFIRM from peer...");
  
  // Improved retry logic with exponential backoff
  let record = null;
  const maxAttempts = 8;
  const baseDelay = 800;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt + 1}/${maxAttempts} to fetch KEY_CONFIRM...`);
      const confirmRes = await axios.get(
        `/keyexchange/confirm/${peerUserId}/${myUserId}`
      );
      record = confirmRes.data;
      console.log("✅ KEY_CONFIRM received successfully!");
      break;
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404 && attempt < maxAttempts - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`⏰ KEY_CONFIRM not available yet, waiting ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      console.error(`❌ Failed to get KEY_CONFIRM:`, err.message);
      throw err;
    }
  }

  if (!record) {
    throw new Error("KEY_CONFIRM still not available after retries. Peer may need more time to respond.");
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

  // DEBUG: Log key details
  console.log("🔑 ALICE: Generating session key with:", {
    myKeyType: "alicePrivate",
    peerKeyType: "bobPublic",
    peerKey: payload.bob_ephemeral_public?.x?.substring(0, 20) + "...",
    salt: conversationId
  });

  // Verify the ephemeral public key matches what Bob sent
  const aliceEphemeralPublic = JSON.parse(localStorage.getItem(`ephem_pub_${conversationId}`));
  verifyKeyConsistency(
    payload.alice_ephemeral_public,
    aliceEphemeralPublic,
    "Alice ephemeral public (sent vs received back)"
  );

  const sessionKey = await generateSessionKey(
    aliceEphemeralPrivate,
    payload.bob_ephemeral_public,
    conversationId
  );

  await saveSessionKey(conversationId, sessionKey);
  console.log("✅ Initiator: Session key derived and saved!");

  return { conversationId, sessionKey };
}

// --- High-level helper: ensure a session key exists for (myUserId, peerUserId) ---

export async function ensureSessionKeyForUsers(myUserId, peerUserId) {
  console.log("🔍 ensureSessionKeyForUsers CALLED WITH:", {
    myUserId, peerUserId,
    type_myUserId: typeof myUserId,
    type_peerUserId: typeof peerUserId
  });

  // 1) If a session key already exists, just return it
  const existing = await loadSessionKeyForUsers(myUserId, peerUserId);
  if (existing) {
    console.log("🔍 Existing sessionKey found. Using stored key.");
    return existing;
  }

  // 2) Decide who is initiator vs responder
  const myIdStr = String(myUserId);
  const peerIdStr = String(peerUserId);

  console.log("🔍 Converted IDs:", { myIdStr, peerIdStr });
  console.log(
    "🔍 Comparing IDs to determine initiator:",
    `"${myIdStr}" < "${peerIdStr}" = ${myIdStr < peerIdStr}`
  );

  const amInitiator = myIdStr < peerIdStr;

  if (amInitiator) {
    console.log("🔍 Am I initiator? YES (sending KEY_INIT)");
    
    await sendKeyInit(myUserId, peerUserId);
    console.log("🔍 Initiator: sending KEY_INIT");

    try {
      console.log("🔍 Initiator: waiting for KEY_CONFIRM");
      const { sessionKey } = await finalizeInitiatorSessionKey(myUserId, peerUserId);

      // Export key
      const keyB64 = await keyToBase64(sessionKey);
      console.log("🔑 [KeyExchange] Initiator sessionKey (base64) =", keyB64);

      return sessionKey;
    } catch (err) {
      console.warn("[KeyExchange] Initiator could not finalize session key. Peer may not have responded.", err);
      throw err;
    }

  } else {
    console.log("🔍 Am I initiator? NO (waiting for KEY_INIT)");

    try {
      console.log("🔍 Responder: waiting for KEY_INIT then generating KEY_CONFIRM");
      const { sessionKey } = await respondToKeyInitAndDeriveSessionKey(myUserId, peerUserId);

      const keyB64 = await keyToBase64(sessionKey);
      console.log("🔑 [KeyExchange] Responder sessionKey (base64) =", keyB64);

      return sessionKey;
    } catch (err) {
      console.warn("[KeyExchange] Responder could not derive session key. KEY_INIT may not be available yet.", err);
      throw err;
    }
  }
}

// Add this debug function to your keyExchange.js
export async function debugKeyTransmission() {
  try {
    // Generate a real ephemeral key pair for testing
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "ECDH",
        namedCurve: "P-256"
      },
      true,
      ["deriveKey", "deriveBits"]
    );

    const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
    
    console.log("🔑 [FRONTEND DEBUG] Generated test key:");
    console.log("  X:", publicKeyJwk.x?.substring(0, 30));
    console.log("  Y:", publicKeyJwk.y?.substring(0, 30));
    console.log("  Full X length:", publicKeyJwk.x?.length);
    console.log("  Full Y length:", publicKeyJwk.y?.length);

    // Send to debug endpoint
    const response = await axios.post('/api/keyexchange/debug-key-transmission', {
      originalKey: publicKeyJwk
    });

    console.log("🔑 [FRONTEND DEBUG] Test result:", response.data);
    return response.data;

  } catch (error) {
    console.error("❌ Debug test failed:", error);
  }
}