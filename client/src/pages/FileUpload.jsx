import { useState } from "react";
import { encryptFileBuffer } from "../crypto/fileEncryption";
import { ensureSessionKeyForUsers } from "../crypto/keyExchange";
import axiosClient from "../api/axiosClient";

export default function FileUpload({ currentUserId, peerId }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleUpload() {
    if (!selectedFile || !currentUserId || !peerId) return;

    setUploading(true);
    setMessage("");

    try {
      // 1. Get session key for encryption
      const sessionKey = await ensureSessionKeyForUsers(currentUserId, peerId);
      
      // 2. Read file as ArrayBuffer
      const arrayBuffer = await selectedFile.arrayBuffer();
      
      console.log("📁 Original file size:", arrayBuffer.byteLength, "bytes");

      // 3. Encrypt file CLIENT-SIDE
      const { iv, ciphertext } = await encryptFileBuffer(sessionKey, arrayBuffer);
      
      console.log("🔐 Encrypted data size:", ciphertext.length, "characters");
      console.log("✅ File encrypted before upload");

      // 4. Generate security parameters
      const nonce = crypto.randomUUID();
      const sequenceNumber = Date.now();

      // 5. Send ENCRYPTED data to server (not raw file)
      const response = await axiosClient.post("/files/upload", {
        senderId: currentUserId,
        receiverId: peerId,
        filename: selectedFile.name,
        ciphertext,  // Already encrypted base64 string
        iv,
        nonce,
        sequenceNumber
      });

      setMessage(`✅ File uploaded successfully! ID: ${response.data.id}`);
      
      // 6. Verify encryption worked
      console.log("📊 Upload verification:");
      console.log(" - Original filename:", selectedFile.name);
      console.log(" - Stored file ID:", response.data.id);
      console.log(" - Encryption IV used:", iv.substring(0, 20) + "...");

    } catch (error) {
      console.error("Upload error:", error);
      setMessage(`❌ Upload failed: ${error.response?.data?.error || error.message}`);
    }

    setUploading(false);
  }

  return (
    <div className="p-6 border rounded-lg bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Secure File Upload</h3>
      
      <input
        type="file"
        onChange={(e) => setSelectedFile(e.target.files[0])}
        className="w-full border p-3 rounded-lg mb-4"
      />

      <button
        onClick={handleUpload}
        disabled={!selectedFile || uploading}
        className={`w-full py-3 rounded-lg font-semibold text-white
          ${uploading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"} 
          transition-all`}
      >
        {uploading ? "🔄 Encrypting & Uploading..." : "🔒 Upload Encrypted File"}
      </button>

      {message && (
        <p className={`mt-4 p-3 rounded ${
          message.includes("✅") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
        }`}>
          {message}
        </p>
      )}

      {selectedFile && (
        <div className="mt-4 text-sm text-gray-600">
          <p>📄 File: {selectedFile.name}</p>
          <p>📦 Size: {(selectedFile.size / 1024).toFixed(2)} KB</p>
          <p>🔐 Status: {uploading ? "Encrypting..." : "Ready for secure upload"}</p>
        </div>
      )}
    </div>
  );
}