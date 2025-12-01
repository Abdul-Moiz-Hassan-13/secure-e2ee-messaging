import { useEffect, useRef, useState } from "react";
import { ensureSessionKeyForUsers } from "../crypto/keyExchange";
import { getDecryptedConversation } from "../api/fetchConversation";
import { sendEncryptedMessage } from "../api/messages";
import axiosClient from "../api/axiosClient";
import { useParams } from "react-router-dom";
import { uploadEncryptedFile, downloadAndDecryptFile } from "../api/files";

export default function ChatPage({ currentUserId }) {
  const { peerId } = useParams();
  const userId = currentUserId;
  const [sessionKey, setSessionKey] = useState(null);
  const [peer, setPeer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [downloadingFileIds, setDownloadingFileIds] = useState(new Set());
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  if (!peerId || peerId === "null" || peerId === "undefined") {
    console.error("❌ Invalid peerId:", peerId);
    return <div>Error: Invalid chat route.</div>;
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load peer username
  useEffect(() => {
    async function fetchPeer() {
      const res = await axiosClient.get(`/users/${peerId}`);
      setPeer(res.data);
    }
    fetchPeer();
  }, [peerId]);

  // Main: ensure session key and fetch conversation
  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 5;

    async function init() {
      if (!mounted) return;
      
      setLoading(true);
      setConnectionStatus("connecting");

      try {
        console.log("🔍 ChatPage: userId =", userId, "peerId =", peerId);

        // Get/derive secure session key
        const key = await ensureSessionKeyForUsers(userId, peerId);
        if (!mounted) return;

        setSessionKey(key);
        setConnectionStatus("connected");

        // Load decrypted messages
        const msgs = await getDecryptedConversation(key, userId, peerId);
        if (!mounted) return;

        setMessages(msgs);
        retryCount = 0;

      } catch (err) {
        if (!mounted) return;

        console.error("Error establishing secure session:", err);
        
        if ((err.message.includes("KEY_CONFIRM") || 
             err.message.includes("404") || 
             err.message.includes("not available")) && 
            retryCount < maxRetries) {
          
          retryCount++;
          setConnectionStatus(`retrying (${retryCount}/${maxRetries})`);
          
          const delay = Math.min(2000 * Math.pow(1.5, retryCount - 1), 10000);
          setTimeout(init, delay);
          return;
        }

        setConnectionStatus("failed");
        setMessages([{
          senderId: 'system',
          receiverId: userId,
          plaintext: `🔐 Secure connection failed: ${err.message}. Please refresh to retry.`,
          timestamp: new Date()
        }]);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [userId, peerId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-refresh messages
  useEffect(() => {
    if (!sessionKey || connectionStatus !== "connected") return;

    const interval = setInterval(async () => {
      try {
        const msgs = await getDecryptedConversation(sessionKey, userId, peerId);
        setMessages(msgs);
      } catch (err) {
        console.error("Error refreshing messages:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [sessionKey, userId, peerId, connectionStatus]);

  // Send message
  async function handleSend() {
    if (!input.trim() || !sessionKey) return;

    try {
      await sendEncryptedMessage(sessionKey, userId, peerId, input, Date.now());
      setInput("");

      // Refresh messages
      const msgs = await getDecryptedConversation(sessionKey, userId, peerId);
      setMessages(msgs);

    } catch (err) {
      console.error("Send error:", err);
      setMessages(prev => [...prev, {
        senderId: 'system',
        receiverId: userId,
        plaintext: `❌ Failed to send message: ${err.message}`,
        timestamp: new Date()
      }]);
    }
  }

  // File upload handler
  async function handleFileUpload(file) {
    if (!file || !sessionKey) return;

    setUploadingFile(true);
    try {
      console.log("📁 Uploading file:", file.name);
      
      // Upload encrypted file
      const result = await uploadEncryptedFile(sessionKey, file, userId, peerId);
      
      console.log("✅ File uploaded with ID:", result.id);
      
      // Send file notification message
      await sendEncryptedMessage(
        sessionKey, 
        userId, 
        peerId, 
        `FILE_SENT:${result.id}:${file.name}:${file.size}`, 
        Date.now()
      );

      // Refresh messages
      const msgs = await getDecryptedConversation(sessionKey, userId, peerId);
      setMessages(msgs);

    } catch (error) {
      console.error("❌ File upload failed:", error);
      setMessages(prev => [...prev, {
        senderId: 'system',
        receiverId: userId,
        plaintext: `❌ Failed to upload file: ${error.message}`,
        timestamp: new Date()
      }]);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  // File download handler
  async function handleFileDownload(fileId, filename) {
    if (!sessionKey || downloadingFileIds.has(fileId)) return;

    setDownloadingFileIds(prev => new Set(prev).add(fileId));
    
    try {
      console.log("📥 Downloading file:", fileId);
      
      // Download and decrypt file
      const { blob } = await downloadAndDecryptFile(sessionKey, fileId);
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log("✅ File downloaded:", filename);
      
    } catch (error) {
      console.error("❌ File download failed:", error);
      setMessages(prev => [...prev, {
        senderId: 'system',
        receiverId: userId,
        plaintext: `❌ Failed to download file: ${error.message}`,
        timestamp: new Date()
      }]);
    } finally {
      setDownloadingFileIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    }
  }

  // Parse message to check if it's a file message
  const parseFileMessage = (plaintext) => {
    if (plaintext.startsWith("FILE_SENT:")) {
      const parts = plaintext.split(":");
      if (parts.length >= 4) {
        return {
          isFile: true,
          fileId: parts[1],
          filename: parts[2],
          fileSize: parseInt(parts[3]),
          isSentByMe: false // We'll determine this separately
        };
      }
    }
    return { isFile: false };
  };

  const handleRetryConnection = () => {
    setConnectionStatus("connecting");
    setMessages([]);
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case "connected": return "text-green-600";
      case "connecting": return "text-yellow-600";
      case "failed": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case "connected": return "🔒 Secure Connection Established";
      case "connecting": return "🔄 Establishing Secure Connection...";
      case "failed": return "❌ Connection Failed";
      default: return connectionStatus;
    }
  };

  // File selection handler
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl bg-white shadow-xl rounded-2xl border border-gray-200 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Chat with {peer ? peer.username : "Loading..."}
            </h2>
            <p className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
              {connectionStatus === "failed" && (
                <button 
                  onClick={handleRetryConnection}
                  className="ml-2 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Retry
                </button>
              )}
            </p>
          </div>
          {loading && (
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50 min-h-[400px]">
          {messages.map((msg, idx) => {
            const isMine = msg.senderId === userId;
            const isSystem = msg.senderId === 'system';
            const fileInfo = parseFileMessage(msg.plaintext);
            
            if (isSystem) {
              return (
                <div key={idx} className="flex justify-center">
                  <div className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm max-w-md text-center">
                    {msg.plaintext}
                  </div>
                </div>
              );
            }

            if (fileInfo.isFile) {
              // Determine if this file was sent by me or received
              const fileIsFromMe = isMine;
              
              return (
                <div key={idx} className={`flex ${fileIsFromMe ? "justify-end" : "justify-start"}`}>
                  <div className={`
                    max-w-xs px-4 py-3 rounded-xl shadow-sm
                    ${fileIsFromMe ? "bg-blue-100 text-gray-800 rounded-br-none"
                                   : "bg-gray-100 text-gray-800 rounded-bl-none"}
                  `}>
                    <div className="flex items-center mb-2">
                      <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div>
                        <p className="font-medium text-sm">{fileInfo.filename}</p>
                        <p className="text-xs text-gray-500">
                          {Math.round(fileInfo.fileSize / 1024)} KB • 
                          {fileIsFromMe ? " Sent" : " Received"}
                        </p>
                      </div>
                    </div>
                    
                    {/* Download button for received files */}
                    {!fileIsFromMe && (
                      <button
                        onClick={() => handleFileDownload(fileInfo.fileId, fileInfo.filename)}
                        disabled={downloadingFileIds.has(fileInfo.fileId)}
                        className="w-full px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 
                                 text-white text-xs rounded-lg flex items-center justify-center gap-1"
                      >
                        {downloadingFileIds.has(fileInfo.fileId) ? (
                          <>
                            <span className="animate-spin">⟳</span> Downloading...
                          </>
                        ) : (
                          <>
                            📥 Download File
                          </>
                        )}
                      </button>
                    )}
                    
                    {/* Info for sent files */}
                    {fileIsFromMe && (
                      <div className="text-xs text-gray-500 flex items-center">
                        <span className="text-green-500 mr-1">✓</span>
                        File sent securely • ID: {fileInfo.fileId.substring(0, 8)}...
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            // Regular text message
            return (
              <div key={idx} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className={`
                  max-w-xs px-4 py-2 rounded-xl shadow-sm text-sm
                  ${isMine ? "bg-blue-600 text-white rounded-br-none"
                           : "bg-gray-200 text-gray-900 rounded-bl-none"}
                `}>
                  {msg.plaintext}
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef}></div>
        </div>

        {/* File Upload & Message Input */}
        <div className="border-t px-4 py-3 bg-white">
          {/* File upload indicator */}
          {uploadingFile && (
            <div className="mb-3 p-2 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700 text-sm">
                <span className="animate-spin">⟳</span>
                <span>Encrypting and uploading file...</span>
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="flex items-center gap-3">
            {/* File attachment button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!sessionKey || connectionStatus !== "connected" || uploadingFile}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 
                       disabled:cursor-not-allowed text-gray-700 rounded-lg shadow-sm 
                       transition-colors flex items-center gap-2"
              title="Send a secure file"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <span className="hidden sm:inline">Attach</span>
            </button>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              disabled={!sessionKey || connectionStatus !== "connected"}
            />

            {/* Message input */}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                connectionStatus === "connected" 
                  ? "Type your message or attach a file..." 
                  : "Establishing secure connection..."
              }
              disabled={connectionStatus !== "connected" || loading}
              className="flex-1 px-4 py-2 border rounded-lg shadow-sm focus:ring-2 
                       focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 
                       disabled:cursor-not-allowed"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && connectionStatus === "connected") {
                  handleSend();
                }
              }}
            />

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={(!input.trim() && !uploadingFile) || !sessionKey || connectionStatus !== "connected" || loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 
                       disabled:cursor-not-allowed text-white font-medium rounded-lg 
                       shadow-md transition"
            >
              {uploadingFile ? "Uploading..." : "Send"}
            </button>
          </div>

          {/* Help text */}
          <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
            <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>End-to-end encrypted • Files encrypted client-side</span>
          </div>
        </div>

      </div>
    </div>
  );
}