import axiosClient from "./axiosClient";
import { encryptFileBuffer, decryptFileBuffer } from "../crypto/fileEncryption";

// Upload encrypted file
export async function uploadEncryptedFile(sessionKey, file, senderId, receiverId) {
  try {
    console.log("🔐 Starting secure file upload...");
    
    // 1. Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    console.log("📁 Original file:", {
      name: file.name,
      size: arrayBuffer.byteLength + " bytes",
      type: file.type
    });

    // 2. Encrypt file CLIENT-SIDE
    const { iv, ciphertext } = await encryptFileBuffer(sessionKey, arrayBuffer);
    console.log("✅ File encrypted client-side");
    console.log("📊 Encrypted data size:", ciphertext.length + " characters");

    // 3. Generate security parameters
    const nonce = crypto.randomUUID();
    const sequenceNumber = Date.now();

    // 4. Send ENCRYPTED data to server
    console.log("📤 Uploading encrypted data to server...");
    const response = await axiosClient.post("/files/upload", {
      senderId,
      receiverId,
      filename: file.name,
      ciphertext,  // Already encrypted base64 string
      iv,
      nonce,
      sequenceNumber
    });

    console.log("🎉 File uploaded successfully! ID:", response.data.id);
    return response.data;

  } catch (error) {
    console.error("❌ Upload failed:", error);
    throw error;
  }
}

// Download and decrypt file (your existing function)
export async function downloadAndDecryptFile(sessionKey, fileId) {
  try {
    console.log("🔍 Fetching encrypted file from server...");
    
    const { data } = await axiosClient.get(`/files/download/${fileId}`);
    const { filename, ciphertext, iv, mimeType } = data;

    console.log("📥 Received encrypted file:", {
      filename,
      ciphertextLength: ciphertext.length + " characters",
      iv: iv.substring(0, 20) + "..."
    });

    console.log("🔓 Decrypting file client-side...");
    const decryptedBuffer = await decryptFileBuffer(sessionKey, ciphertext, iv);
    
    console.log("✅ File decrypted successfully!");
    console.log("📊 Decrypted size:", decryptedBuffer.byteLength + " bytes");

    const blob = new Blob([decryptedBuffer], { type: mimeType });
    return { blob, filename };
    
  } catch (error) {
    console.error("❌ Download/decrypt error:", error);
    throw error;
  }
}