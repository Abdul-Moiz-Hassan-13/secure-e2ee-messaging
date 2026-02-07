import { useEffect, useState } from "react";
import { encryptFileBuffer, decryptFileBuffer } from "../crypto/fileEncryption";
import { Link } from "react-router-dom";

const getBase64ByteLength = (base64) => {
  if (!base64) {
    return 0;
  }

  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
};

export default function FileTest() {
  const [sessionKey, setSessionKey] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [encryptedData, setEncryptedData] = useState(null);
  const [decryptedBlob, setDecryptedBlob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [operation, setOperation] = useState("");
  const [fileInfo, setFileInfo] = useState(null);

  useEffect(() => {
    (async () => {
      const key = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
      );
      setSessionKey(key);
    })();
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setFileInfo({
        name: file.name,
        size: (file.size / 1024).toFixed(2) + " KB",
        type: file.type || "Unknown",
        lastModified: new Date(file.lastModified).toLocaleString()
      });
    }
  };

  async function handleEncrypt() {
    if (!selectedFile || !sessionKey) return;

    setLoading(true);
    setOperation("encrypting");
    
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const encrypted = await encryptFileBuffer(sessionKey, arrayBuffer);

      setEncryptedData(encrypted);
      
      setTimeout(() => {
        setLoading(false);
        setOperation("");
      }, 500);
    } catch (error) {
      console.error("Encryption failed:", error);
      setLoading(false);
      setOperation("");
    }
  }

  async function handleDecrypt() {
    if (!encryptedData || !sessionKey) return;

    setLoading(true);
    setOperation("decrypting");
    
    try {
      const decryptedBuffer = await decryptFileBuffer(
        sessionKey,
        encryptedData.ciphertext,
        encryptedData.iv
      );

      const blob = new Blob([decryptedBuffer], {
        type: selectedFile.type,
      });

      setDecryptedBlob(blob);
      
      setTimeout(() => {
        setLoading(false);
        setOperation("");
      }, 500);
    } catch (error) {
      console.error("Decryption failed:", error);
      setLoading(false);
      setOperation("");
    }
  }

  const handleReset = () => {
    setSelectedFile(null);
    setEncryptedData(null);
    setDecryptedBlob(null);
    setFileInfo(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-indigo-950 overflow-hidden relative">
      
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <div 
            key={i}
            className="particle absolute w-1 h-1 bg-indigo-500/20 rounded-full animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
        
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="absolute top-6 left-6 z-20">
        <Link 
          to="/dashboard" 
          className="flex items-center gap-2 px-4 py-2 bg-gray-900/50 backdrop-blur-sm text-gray-300 hover:text-white rounded-xl border border-gray-800/50 hover:border-gray-700/50 transition-all duration-300 group"
        >
          <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
          <span className="font-medium">Back to Dashboard</span>
        </Link>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-2xl">
          
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-600/20 to-blue-500/20 rounded-2xl border border-indigo-500/30 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-blue-400 rounded-xl flex items-center justify-center">
                <span className="text-white text-3xl">🔐</span>
              </div>
            </div>
            
            <h1 className="text-4xl font-bold text-white mb-4">
              File <span className="bg-gradient-to-r from-indigo-400 to-blue-300 bg-clip-text text-transparent">Encryption</span> Test
            </h1>
            <p className="text-gray-400 max-w-md mx-auto text-lg">
              AES-256 encryption with client-side processing
            </p>
          </div>

          <div className="bg-gray-900/50 backdrop-blur-xl rounded-3xl border border-gray-800/50 shadow-2xl overflow-hidden">
            
            <div className="p-8 border-b border-gray-800/50">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">Local Encryption Laboratory</h2>
                  <p className="text-gray-400">Your files never leave your browser unencrypted</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center">
                  <span className="text-green-400 text-xl">✓</span>
                </div>
              </div>
              
              {!sessionKey ? (
                <div className="flex items-center justify-center p-6 bg-gray-900/30 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-indigo-300">Generating secure session key...</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-gray-900/30 rounded-xl">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-400 font-medium">Session Key Ready</span>
                  <span className="text-gray-500 text-sm ml-auto">AES-256-GCM</span>
                </div>
              )}
            </div>

            <div className="p-8 space-y-8">
              
              <div className="space-y-4">
                <label className="block text-gray-300 font-medium text-lg">
                  Select File
                </label>
                <div className="relative group">
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={loading}
                  />
                  <div className="border-2 border-dashed border-gray-700 rounded-2xl p-10 text-center transition-all duration-300 group-hover:border-indigo-500/50 group-hover:bg-gray-800/20">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 flex items-center justify-center">
                        <span className="text-3xl text-gray-500">📁</span>
                      </div>
                      <div>
                        <p className="text-white font-medium mb-1">Drag & drop or click to browse</p>
                        <p className="text-gray-500 text-sm">Maximum file size: 100MB</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {fileInfo && (
                <div className="bg-gray-900/30 rounded-xl border border-gray-800/50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Selected File</h3>
                    <button
                      onClick={handleReset}
                      className="text-sm text-gray-400 hover:text-gray-300 transition-colors flex items-center gap-1"
                    >
                      <span>↻</span> Clear
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Filename</p>
                      <p className="text-white font-medium truncate">{fileInfo.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Size</p>
                      <p className="text-white font-medium">{fileInfo.size}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Type</p>
                      <p className="text-white font-medium">{fileInfo.type}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Modified</p>
                      <p className="text-white font-medium text-sm">{fileInfo.lastModified}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                  onClick={handleEncrypt}
                  disabled={!selectedFile || loading}
                  className={`
                    relative overflow-hidden group p-6 rounded-2xl
                    ${!selectedFile || loading ? "bg-gray-800/30 cursor-not-allowed" : "bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600"}
                    transition-all duration-300 shadow-lg hover:shadow-xl border border-indigo-500/30
                    flex flex-col items-center justify-center gap-4
                  `}
                >
                  <div className="relative">
                    <div className="w-16 h-16 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                      <span className="text-white text-3xl">🔒</span>
                    </div>
                    {operation === "encrypting" && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"></div>
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-white mb-2">Encrypt File</h3>
                    <p className="text-white/80 text-sm">AES-256-GCM encryption</p>
                  </div>
                  {operation === "encrypting" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-white">Encrypting...</span>
                      </div>
                    </div>
                  )}
                </button>

                <button
                  onClick={handleDecrypt}
                  disabled={!encryptedData || loading}
                  className={`
                    relative overflow-hidden group p-6 rounded-2xl
                    ${!encryptedData || loading ? "bg-gray-800/30 cursor-not-allowed" : "bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600"}
                    transition-all duration-300 shadow-lg hover:shadow-xl border border-emerald-500/30
                    flex flex-col items-center justify-center gap-4
                  `}
                >
                  <div className="relative">
                    <div className="w-16 h-16 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                      <span className="text-white text-3xl">🔓</span>
                    </div>
                    {operation === "decrypting" && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"></div>
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-white mb-2">Decrypt File</h3>
                    <p className="text-white/80 text-sm">Restore original content</p>
                  </div>
                  {operation === "decrypting" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-white">Decrypting...</span>
                      </div>
                    </div>
                  )}
                </button>
              </div>

              {encryptedData && !operation && (
                <div className="bg-gradient-to-r from-indigo-900/20 to-blue-900/10 rounded-xl border border-indigo-800/30 p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                      <span className="text-green-400 text-2xl">✅</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">File Encrypted Successfully</h3>
                      <p className="text-gray-400">Ciphertext size: {(getBase64ByteLength(encryptedData.ciphertext) / 1024).toFixed(2)} KB</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-gray-900/50 rounded-full mr-2">
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                      IV Generated
                    </span>
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-gray-900/50 rounded-full">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                      Authentication Tag
                    </span>
                  </div>
                </div>
              )}

              {decryptedBlob && (
                <div className="bg-gradient-to-r from-emerald-900/20 to-teal-900/10 rounded-xl border border-emerald-800/30 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                        <span className="text-emerald-400 text-2xl">✅</span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">File Decrypted Successfully</h3>
                        <p className="text-gray-400">Ready for download</p>
                      </div>
                    </div>
                    <a
                      href={URL.createObjectURL(decryptedBlob)}
                      download={`decrypted_${selectedFile.name}`}
                      className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-500/20 transition-all duration-300 flex items-center gap-2 group"
                    >
                      <span>⬇️</span>
                      Download
                      <span className="group-hover:translate-y-1 transition-transform">↓</span>
                    </a>
                  </div>
                  <div className="text-sm text-gray-500">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-gray-900/50 rounded-full mr-2">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                      Integrity Verified
                    </span>
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-gray-900/50 rounded-full">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      Authenticated
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 text-center">
            <div className="inline-flex flex-wrap justify-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-2 px-3 py-1 bg-gray-900/30 rounded-full border border-gray-800/50">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
                Client-Side Only
              </span>
              <span className="flex items-center gap-2 px-3 py-1 bg-gray-900/30 rounded-full border border-gray-800/50">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                Zero Data Upload
              </span>
              <span className="flex items-center gap-2 px-3 py-1 bg-gray-900/30 rounded-full border border-gray-800/50">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                GCM Authentication
              </span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .particle {
          animation: float 8s ease-in-out infinite;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-15px) scale(1.05); }
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}