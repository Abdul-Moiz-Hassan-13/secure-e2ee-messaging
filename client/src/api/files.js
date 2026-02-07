import axiosClient from "./axiosClient";
import { encryptFileBuffer, decryptFileBuffer } from "../crypto/fileEncryption";

export async function uploadEncryptedFile(sessionKey, file, senderId, receiverId) {
  try {
    console.log("Starting secure file upload...");
    
    const arrayBuffer = await file.arrayBuffer();
    console.log("Original file:", {
      name: file.name,
      size: arrayBuffer.byteLength + " bytes",
      type: file.type
    });

    const { iv, ciphertext } = await encryptFileBuffer(sessionKey, arrayBuffer);
    console.log("File encrypted client-side");
    console.log("Encrypted data size:", ciphertext.length + " characters");

    const nonce = crypto.randomUUID();

    console.log("Uploading encrypted data to server...");
    const response = await axiosClient.post("/files/upload", {
      senderId,
      receiverId,
      filename: file.name,
      ciphertext,
      iv,
      nonce,
    });

    console.log("File uploaded successfully! ID:", response.data.id);
    return response.data;

  } catch (error) {
    console.error("Upload failed:", error);
    throw error;
  }
}

export async function downloadAndDecryptFile(sessionKey, fileId) {
  try {
    console.log("Fetching encrypted file from server...");
    
    const { data } = await axiosClient.get(`/files/download/${fileId}`);
    const { filename, ciphertext, iv, mimeType } = data;

    console.log("Received encrypted file:", {
      filename,
      ciphertextLength: ciphertext.length + " characters",
      iv: iv.substring(0, 20) + "..."
    });

    console.log("Decrypting file client-side...");
    const decryptedBuffer = await decryptFileBuffer(sessionKey, ciphertext, iv);
    
    console.log("File decrypted successfully!");
    console.log("Decrypted size:", decryptedBuffer.byteLength + " bytes");

    const blob = new Blob([decryptedBuffer], { type: mimeType });
    return { blob, filename };
    
  } catch (error) {
    console.error("Download/decrypt error:", error);
    throw error;
  }
}