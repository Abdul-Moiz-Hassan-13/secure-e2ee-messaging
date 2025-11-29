import { useState } from "react";
import { downloadAndDecryptFile } from "../api/files";

export default function FileDownloadTest({ sessionKey }) {
  const [fileId, setFileId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleDownload() {
    setLoading(true);
    setMessage("");

    try {
      const { blob, filename } =
        await downloadAndDecryptFile(sessionKey, fileId);

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();

      URL.revokeObjectURL(url);

      setMessage("File decrypted and downloaded.");
    } catch (error) {
      console.error(error);
      setMessage("Failed to download or decrypt file.");
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-xl bg-white shadow-lg rounded-2xl p-8 border border-gray-200">

        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Encrypted File Download Test
        </h2>

        <input
          type="text"
          placeholder="Enter file ID"
          value={fileId}
          onChange={(e) => setFileId(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg shadow-sm mb-6"
        />

        <button
          onClick={handleDownload}
          disabled={loading || !fileId}
          className={`
            w-full py-3 text-white font-semibold rounded-xl shadow-md
            ${loading ? "bg-green-400" : "bg-green-600 hover:bg-green-700"}
            transition-all
          `}
        >
          {loading ? "Processing..." : "Download & Decrypt"}
        </button>

        {message && (
          <p
            className={`mt-5 text-center font-medium ${
              message.includes("downloaded") ? "text-green-600" : "text-red-600"
            }`}
          >
            {message}
          </p>
        )}

      </div>
    </div>
  );
}
