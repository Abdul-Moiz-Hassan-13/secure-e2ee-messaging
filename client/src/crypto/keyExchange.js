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

function verifyKeyConsistency(key1, key2, label) {
  if (!key1 || !key2) {
    console.log(`${label}: One or both keys are missing`);
    return false;
  }
  const str1 = JSON.stringify(key1);
  const str2 = JSON.stringify(key2);
  const isEqual = str1 === str2;
  console.log(`${label} keys equal:`, isEqual);
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

  const conversationId = buildConversationId(fromUserId, toUserId);
  const privKeyTag = `ephem_priv_${conversationId}`;
  const pubKeyTag  = `ephem_pub_${conversationId}`;

  let ephemeralPrivate = await loadEphemeralPrivateKey(conversationId);
  let ephemeralPubJwk = localStorage.getItem(pubKeyTag);

  if (!ephemeralPrivate || !ephemeralPubJwk) {
    const ephemeral = await generateEphemeralECDHKeyPair();
    ephemeralPrivate = ephemeral.privateKey;

    ephemeralPubJwk = await exportEphemeralPublicKey(ephemeral.publicKey);

    await saveEphemeralPrivateKey(conversationId, ephemeralPrivate);
    localStorage.setItem(pubKeyTag, JSON.stringify(ephemeralPubJwk));
  } else {
    ephemeralPubJwk = JSON.parse(ephemeralPubJwk);
  }

  console.log("[DEBUG] Alice's stored ephemeral key:", {
    x: ephemeralPubJwk.x?.substring(0, 30),
    y: ephemeralPubJwk.y?.substring(0, 30)
  });

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

  console.log("[DEBUG] Alice's sent ephemeral key:", {
    x: payload.alice_ephemeral_public.x?.substring(0, 30),
    y: payload.alice_ephemeral_public.y?.substring(0, 30)
  });

  const signature = await signPayload(identityPrivateKey, payload);
  payload.signature = signature;

  console.log("SENDING KEY_INIT with ephemeral public:", ephemeralPubJwk.x?.substring(0, 20) + "...");

  const response = await axios.post("/keyexchange/init", {
    from: fromUserId,
    to: toUserId,
    payload,
  });

  return response.data;
}

export async function respondToKeyInitAndDeriveSessionKey(myUserId, peerUserId) {
  const conversationId = buildConversationId(myUserId, peerUserId);

  console.log("Responder: Waiting for KEY_INIT from peer...");
  
  let record = null;
  const maxAttempts = 15; // Increase from implicit 1 to 15 attempts
  const baseDelay = 800;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      console.log(`Attempt ${attempt + 1}/${maxAttempts} to fetch KEY_INIT...`);
      const initRes = await axios.get(`/keyexchange/init/${peerUserId}/${myUserId}`);
      record = initRes.data;
      console.log("KEY_INIT received successfully!");
      break;
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404 && attempt < maxAttempts - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`KEY_INIT not available yet, waiting ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      console.error(`Failed to get KEY_INIT:`, err.message);
      throw err;
    }
  }

  if (!record) {
    throw new Error("KEY_INIT still not available after retries. Peer may need more time to respond.");
  }

  const payload = record.payload;

  console.log("[DEBUG] BOB RECEIVED KEY_INIT:");
  console.log("Ephemeral Key X (first 30 chars):", payload.alice_ephemeral_public?.x?.substring(0, 30));
  console.log("Ephemeral Key Y (first 30 chars):", payload.alice_ephemeral_public?.y?.substring(0, 30));
  console.log("Full Key Structure:", JSON.stringify(payload.alice_ephemeral_public).substring(0, 200) + "...");

  console.log("[DEBUG] Bob received KEY_INIT:");
  console.log("Key X:", payload.alice_ephemeral_public?.x?.substring(0, 30));
  console.log("Record timestamp:", record.createdAt);
  console.log("Current time:", new Date().toISOString());
  
  const { signature, ...unsignedPayload } = payload;

  const aliceIdentityPublicJwk = payload.alice_identity_public;

  const isValid = await verifyPayload(
    aliceIdentityPublicJwk,
    unsignedPayload,
    signature
  );

  if (!isValid) {
    throw new Error("Invalid KEY_INIT signature from peer (possible MITM).");
  }

  const ephBob = await generateEphemeralECDHKeyPair();
  const ephBobPubJwk = await exportEphemeralPublicKey(ephBob.publicKey);

  console.log("BOB: Generating session key with:", {
    myKeyType: "bobPrivate",
    peerKeyType: "alicePublic", 
    peerKey: payload.alice_ephemeral_public?.x?.substring(0, 20) + "...",
    salt: conversationId
  });

  const sessionKey = await generateSessionKey(
    ephBob.privateKey,
    payload.alice_ephemeral_public,
    conversationId
  );

  await saveSessionKey(conversationId, sessionKey);

  const bobIdentityPrivateKey = await loadIdentityKeyPair(myUserId);
  const bobIdentityPublicJwk = await loadPublicIdentityKey(myUserId);

  if (!bobIdentityPrivateKey || !bobIdentityPublicJwk) {
    throw new Error("Bob's identity keys not found on this device.");
  }

  const confirmPayload = {
    type: "KEY_CONFIRM",
    from: myUserId,         
    to: peerUserId,  
    bob_identity_public: bobIdentityPublicJwk,
    bob_ephemeral_public: ephBobPubJwk,
    alice_ephemeral_public: payload.alice_ephemeral_public,
    timestamp: Date.now(),
    nonce: crypto.randomUUID(),
    sequence: 2,
  };

  console.log("[DEBUG] Bob sending back Alice's ephemeral key:", {
    x: confirmPayload.alice_ephemeral_public?.x?.substring(0, 30),
    y: confirmPayload.alice_ephemeral_public?.y?.substring(0, 30)
  });

  const confirmSignature = await signPayload(bobIdentityPrivateKey, confirmPayload);
  confirmPayload.signature = confirmSignature;

  console.log("BOB: Sending KEY_CONFIRM with ephemeral public:", ephBobPubJwk.x?.substring(0, 20) + "...");

  await axios.post("/keyexchange/confirm", {
    from: myUserId,
    to: peerUserId,
    payload: confirmPayload,
  });

  return { conversationId, sessionKey };
}

export async function finalizeInitiatorSessionKey(myUserId, peerUserId) {
  const conversationId = buildConversationId(myUserId, peerUserId);

  const aliceEphemeralPrivate = await loadEphemeralPrivateKey(conversationId);
  if (!aliceEphemeralPrivate) {
    throw new Error("Ephemeral private key for initiator not found. Did you call sendKeyInit?");
  }

  console.log("Initiator: Waiting for KEY_CONFIRM from peer...");
  
  let record = null;
  const maxAttempts = 20; // Increased from 8 to 20 attempts for longer wait
  const baseDelay = 800;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      console.log(`Attempt ${attempt + 1}/${maxAttempts} to fetch KEY_CONFIRM...`);
      const confirmRes = await axios.get(
        `/keyexchange/confirm/${peerUserId}/${myUserId}`
      );
      record = confirmRes.data;
      console.log("KEY_CONFIRM received successfully!");
      break;
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404 && attempt < maxAttempts - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`KEY_CONFIRM not available yet, waiting ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      console.error(`Failed to get KEY_CONFIRM:`, err.message);
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

  console.log("ALICE: Generating session key with:", {
    myKeyType: "alicePrivate",
    peerKeyType: "bobPublic",
    peerKey: payload.bob_ephemeral_public?.x?.substring(0, 20) + "...",
    salt: conversationId
  });

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
  console.log("Initiator: Session key derived and saved!");

  return { conversationId, sessionKey };
}

export async function ensureSessionKeyForUsers(myUserId, peerUserId) {
  console.log("ensureSessionKeyForUsers CALLED WITH:", {
    myUserId, peerUserId
  });

  const { buildConversationId, loadSessionKey } = await import("./sessionKey.js");
  const convId = buildConversationId(myUserId, peerUserId);
  
  // Check if we already have a session key
  let sessionKey = await loadSessionKey(convId);
  
  if (sessionKey) {
    console.log("✓ Using existing session key (version tracked)");
    return sessionKey;
  }

  // Need to establish new session key via ephemeral key exchange
  console.log("No session key found - initiating key exchange");
  
  // Deterministic role assignment: user with smaller ID initiates
  const [smallerId, largerId] = [String(myUserId), String(peerUserId)].sort();
  const isInitiator = String(myUserId) === smallerId;
  
  if (isInitiator) {
    console.log(`I am INITIATOR (my ID: ${myUserId}, peer ID: ${peerUserId})`);
    await sendKeyInit(myUserId, peerUserId);
    const result = await finalizeInitiatorSessionKey(myUserId, peerUserId);
    return result.sessionKey;
  } else {
    console.log(`I am RESPONDER (my ID: ${myUserId}, peer ID: ${peerUserId})`);
    const result = await respondToKeyInitAndDeriveSessionKey(myUserId, peerUserId);
    return result.sessionKey;
  }
}

export async function debugKeyTransmission() {
  try {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "ECDH",
        namedCurve: "P-256"
      },
      true,
      ["deriveKey", "deriveBits"]
    );

    const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
    
    console.log("[FRONTEND DEBUG] Generated test key:");
    console.log("X:", publicKeyJwk.x?.substring(0, 30));
    console.log("Y:", publicKeyJwk.y?.substring(0, 30));
    console.log("Full X length:", publicKeyJwk.x?.length);
    console.log("Full Y length:", publicKeyJwk.y?.length);

    const response = await axios.post('/api/keyexchange/debug-key-transmission', {
      originalKey: publicKeyJwk
    });

    console.log("[FRONTEND DEBUG] Test result:", response.data);
    return response.data;

  } catch (error) {
    console.error("Debug test failed:", error);
  }
}