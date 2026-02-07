import { useEffect, useRef, useState } from "react";
import { ensureSessionKeyForUsers } from "../crypto/keyExchange";
import { getDecryptedConversation } from "../api/fetchConversation";
import { sendEncryptedMessage } from "../api/messages";
import axiosClient from "../api/axiosClient";
import { useParams, Link } from "react-router-dom";
import { uploadEncryptedFile, downloadAndDecryptFile } from "../api/files";

export default function ChatPage({ currentUserId }) {
  const { peerId } = useParams();
  const userId = currentUserId || localStorage.getItem("userId");
  const [sessionKey, setSessionKey] = useState(null);
  const [peer, setPeer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [downloadingFileIds, setDownloadingFileIds] = useState(new Set());
  const [activeTab, setActiveTab] = useState("chat");
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesContainerRef = useRef(null);

  if (!peerId || peerId === "null" || peerId === "undefined") {
    console.error("Invalid peerId:", peerId);
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-red-950 flex items-center justify-center">
        <div className="text-center text-white p-8 bg-gray-900/50 backdrop-blur-xl rounded-3xl border border-red-800/30">
          <span className="text-6xl mb-4 block">❌</span>
          <h1 className="text-2xl font-bold mb-2">Invalid Chat</h1>
          <p className="text-gray-400 mb-6">The chat link is invalid or corrupted</p>
          <Link to="/chat-select" className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl hover:shadow-lg transition-all">
            Return to Chat Selection
          </Link>
        </div>
      </div>
    );
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Track current peer in localStorage for logout coordination
    localStorage.setItem("currentPeer", peerId);

    async function fetchPeer() {
      try {
        const res = await axiosClient.get(`/users/${peerId}`);
        setPeer(res.data);
      } catch (error) {
        console.error("Failed to fetch peer:", error);
        setPeer({ username: "Unknown User" });
      }
    }
    fetchPeer();
  }, [peerId]);

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const maxRetries = 5;

    async function init() {
      if (!mounted) return;
      
      setLoading(true);
      setConnectionStatus("connecting");

      try {
        console.log("Establishing secure session...");
        const key = await ensureSessionKeyForUsers(userId, peerId);
        if (!mounted) return;

        setSessionKey(key);
        setConnectionStatus("connected");

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
          plaintext: `Secure connection failed: ${err.message}`,
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

  useEffect(() => {
    if (!peerId) return;

    const peerCheckInterval = setInterval(async () => {
      try {
        const res = await axiosClient.get(`/auth/session/${peerId}`);
        if (!res.data.active) {
          console.log("Peer has logged out - forcing logout");
          // Peer logged out, so logout current user too
          localStorage.clear();
          window.location.href = "/login";
        }
      } catch (error) {
        console.error("Error checking peer session:", error);
        // If we can't verify peer session, assume they logged out
        if (error.response?.status === 404) {
          console.log("Peer session not found - forcing logout");
          localStorage.clear();
          window.location.href = "/login";
        }
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(peerCheckInterval);
  }, [peerId]);

  async function handleSend() {
    if (!input.trim() || !sessionKey) return;

    try {
      await sendEncryptedMessage(sessionKey, userId, peerId, input, Date.now());
      setInput("");

      const msgs = await getDecryptedConversation(sessionKey, userId, peerId);
      setMessages(msgs);

    } catch (err) {
      console.error("Send error:", err);
      setMessages(prev => [...prev, {
        senderId: 'system',
        receiverId: userId,
        plaintext: `Failed to send message: ${err.message}`,
        timestamp: new Date()
      }]);
    }
  }

  async function handleFileUpload(file) {
    if (!file || !sessionKey) return;

    setUploadingFile(true);
    try {
      console.log("Uploading file:", file.name);
      
      const result = await uploadEncryptedFile(sessionKey, file, userId, peerId);
      
      console.log("File uploaded with ID:", result.id);
      
      await sendEncryptedMessage(
        sessionKey, 
        userId, 
        peerId, 
        `FILE_SENT:${result.id}:${file.name}:${file.size}`, 
        Date.now()
      );

      const msgs = await getDecryptedConversation(sessionKey, userId, peerId);
      setMessages(msgs);

    } catch (error) {
      console.error("File upload failed:", error);
      setMessages(prev => [...prev, {
        senderId: 'system',
        receiverId: userId,
        plaintext: `Failed to upload file: ${error.message}`,
        timestamp: new Date()
      }]);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleFileDownload(fileId, filename) {
    if (!sessionKey || downloadingFileIds.has(fileId)) return;

    setDownloadingFileIds(prev => new Set(prev).add(fileId));
    
    try {
      console.log("Downloading file:", fileId);
      
      const { blob } = await downloadAndDecryptFile(sessionKey, fileId);
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log("File downloaded:", filename);
      
    } catch (error) {
      console.error("File download failed:", error);
      setMessages(prev => [...prev, {
        senderId: 'system',
        receiverId: userId,
        plaintext: `Failed to download file: ${error.message}`,
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

  const parseFileMessage = (plaintext) => {
    if (plaintext.startsWith("FILE_SENT:")) {
      const parts = plaintext.split(":");
      if (parts.length >= 4) {
        return {
          isFile: true,
          fileId: parts[1],
          filename: parts[2],
          fileSize: parseInt(parts[3]),
          isSentByMe: false
        };
      }
    }
    return { isFile: false };
  };

  const handleRetryConnection = () => {
    setConnectionStatus("connecting");
    setMessages([]);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && connectionStatus === "connected") {
      e.preventDefault();
      handleSend();
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    // Handle both numbers (milliseconds) and ISO strings
    const date = typeof timestamp === "number" ? new Date(timestamp) : new Date(timestamp);
    if (isNaN(date.getTime())) {
      console.warn("Invalid timestamp:", timestamp);
      return "";
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 overflow-hidden relative">
      
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div 
            key={i}
            className="particle absolute w-1 h-1 bg-blue-500/10 rounded-full animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
        
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="relative z-10 h-screen flex flex-col">
        
        <div className="absolute top-6 left-6 z-20">
          <Link 
            to="/chat-select" 
            className="flex items-center gap-2 px-4 py-2 bg-gray-900/50 backdrop-blur-sm text-gray-300 hover:text-white rounded-xl border border-gray-800/50 hover:border-gray-700/50 transition-all duration-300 group"
          >
            <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
            <span className="font-medium">All Chats</span>
          </Link>
        </div>

        <div className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-3xl border border-gray-800/50 shadow-2xl overflow-hidden h-full flex flex-col">
            
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-800/50 bg-gradient-to-r from-gray-900/80 to-blue-900/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                      <span className="text-white text-2xl">💬</span>
                    </div>
                    <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-gray-900 ${
                      connectionStatus === "connected" ? "bg-green-500 animate-pulse" : 
                      connectionStatus === "connecting" ? "bg-yellow-500 animate-pulse" : 
                      "bg-red-500"
                    }`}></div>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">
                      {peer ? peer.username : "Loading..."}
                    </h1>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                        connectionStatus === "connected" ? "bg-green-900/30 text-green-400 border border-green-800/50" : 
                        connectionStatus === "connecting" ? "bg-yellow-900/30 text-yellow-400 border border-yellow-800/50" : 
                        "bg-red-900/30 text-red-400 border border-red-800/50"
                      }`}>
                        {connectionStatus === "connected" ? "🔒 Secure Connection" : 
                         connectionStatus === "connecting" ? "🔄 Connecting..." : 
                         "❌ Connection Failed"}
                      </span>
                      {connectionStatus === "failed" && (
                        <button 
                          onClick={handleRetryConnection}
                          className="px-3 py-1 text-sm bg-blue-900/30 hover:bg-blue-800/40 text-blue-300 rounded-lg border border-blue-800/50 transition-all"
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="hidden md:flex items-center gap-2 text-sm text-gray-400">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span>AES-256-GCM</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">Chat ID</p>
                    <p className="text-white font-mono text-xs">{peerId.slice(-12)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-800/50">
              <button
                onClick={() => setActiveTab("chat")}
                className={`flex-1 py-4 text-center font-medium transition-all ${
                  activeTab === "chat" 
                    ? "text-white border-b-2 border-blue-500" 
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                💬 Messages
              </button>
              <button
                onClick={() => setActiveTab("files")}
                className={`flex-1 py-4 text-center font-medium transition-all ${
                  activeTab === "files" 
                    ? "text-white border-b-2 border-green-500" 
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                📁 Shared Files
              </button>
              <button
                onClick={() => setActiveTab("info")}
                className={`flex-1 py-4 text-center font-medium transition-all ${
                  activeTab === "info" 
                    ? "text-white border-b-2 border-purple-500" 
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                ⚙️ Chat Info
              </button>
            </div>

            {/* Messages Area */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-900/30 to-gray-900/10"
            >
              {activeTab === "chat" && (
                <>
                  {messages.length === 0 && !loading && connectionStatus === "connected" && (
                    <div className="text-center py-16">
                      <div className="w-24 h-24 rounded-full bg-gray-800/30 border border-gray-700/50 flex items-center justify-center mx-auto mb-6">
                        <span className="text-4xl text-gray-500">💭</span>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">Start a Conversation</h3>
                      <p className="text-gray-400">Send your first end-to-end encrypted message</p>
                    </div>
                  )}

                  {messages.map((msg, idx) => {
                    const isMine = msg.senderId === userId;
                    const isSystem = msg.senderId === 'system';
                    const fileInfo = parseFileMessage(msg.plaintext);
                    
                    if (isSystem) {
                      return (
                        <div key={idx} className="flex justify-center">
                          <div className="px-4 py-3 bg-yellow-900/20 text-yellow-300 rounded-xl text-sm max-w-md text-center border border-yellow-800/30">
                            <div className="flex items-center justify-center gap-2">
                              <span>ℹ️</span>
                              {msg.plaintext}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (fileInfo.isFile) {
                      const fileIsFromMe = isMine;
                      
                      return (
                        <div key={idx} className={`flex ${fileIsFromMe ? "justify-end" : "justify-start"}`}>
                          <div className={`
                            max-w-md px-6 py-4 rounded-2xl shadow-lg
                            ${fileIsFromMe ? "bg-gradient-to-r from-blue-900/30 to-cyan-900/20 border border-blue-800/30" 
                                           : "bg-gray-900/50 border border-gray-800/50"}
                            transition-all duration-300 hover:shadow-xl
                          `}>
                            <div className="flex items-start gap-4 mb-3">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-900/50 to-blue-800/30 flex items-center justify-center">
                                <span className="text-2xl">📎</span>
                              </div>
                              <div className="flex-1">
                                <h4 className="text-white font-semibold mb-1">{fileInfo.filename}</h4>
                                <p className="text-gray-400 text-sm mb-3">{formatFileSize(fileInfo.fileSize)} • {formatTime(msg.timestamp)}</p>
                                
                                {!fileIsFromMe && (
                                  <button
                                    onClick={() => handleFileDownload(fileInfo.fileId, fileInfo.filename)}
                                    disabled={downloadingFileIds.has(fileInfo.fileId)}
                                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 
                                             disabled:from-gray-700 disabled:to-gray-600 text-white text-sm rounded-lg 
                                             flex items-center justify-center gap-2 transition-all duration-300"
                                  >
                                    {downloadingFileIds.has(fileInfo.fileId) ? (
                                      <>
                                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                        Decrypting...
                                      </>
                                    ) : (
                                      <>
                                        <span>⬇️</span>
                                        Download File
                                      </>
                                    )}
                                  </button>
                                )}
                                
                                {fileIsFromMe && (
                                  <div className="text-sm text-blue-400 flex items-center gap-2">
                                    <span className="text-green-400">✓</span>
                                    File sent securely • ID: {fileInfo.fileId.substring(0, 8)}...
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={idx} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className={`
                          max-w-md px-6 py-3 rounded-2xl shadow-lg relative
                          ${isMine ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-br-none" 
                                   : "bg-gray-900/50 text-gray-100 rounded-bl-none border border-gray-800/50"}
                          transition-all duration-300 hover:shadow-xl
                        `}>
                          <div className="text-sm mb-1">{msg.plaintext}</div>
                          <div className={`text-xs mt-2 flex justify-end ${isMine ? "text-blue-100" : "text-gray-500"}`}>
                            {formatTime(msg.timestamp)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef}></div>
                </>
              )}

              {activeTab === "files" && (
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-6">Shared Files</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {messages.filter(msg => parseFileMessage(msg.plaintext).isFile).map((msg, idx) => {
                      const fileInfo = parseFileMessage(msg.plaintext);
                      const isMine = msg.senderId === userId;
                      
                      return (
                        <div key={idx} className="bg-gray-900/30 rounded-xl border border-gray-800/50 p-4 hover:border-blue-800/50 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-900/30 to-blue-800/20 flex items-center justify-center">
                              <span className="text-3xl">📎</span>
                            </div>
                            <div className="flex-1">
                              <h4 className="text-white font-semibold truncate">{fileInfo.filename}</h4>
                              <div className="flex items-center gap-3 text-sm text-gray-400 mt-2">
                                <span>{formatFileSize(fileInfo.fileSize)}</span>
                                <span>•</span>
                                <span>{formatTime(msg.timestamp)}</span>
                                <span>•</span>
                                <span className={isMine ? "text-blue-400" : "text-green-400"}>
                                  {isMine ? "Sent" : "Received"}
                                </span>
                              </div>
                            </div>
                            {!isMine && (
                              <button
                                onClick={() => handleFileDownload(fileInfo.fileId, fileInfo.filename)}
                                className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-lg hover:shadow-lg transition-all"
                              >
                                ⬇️
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === "info" && (
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white mb-6">Chat Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-900/30 rounded-xl border border-gray-800/50 p-6">
                      <h4 className="text-lg font-semibold text-white mb-4">Security Details</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Encryption</span>
                          <span className="text-green-400 font-medium">AES-256-GCM</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Key Exchange</span>
                          <span className="text-blue-400 font-medium">ECDH-P256</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Perfect Forward Secrecy</span>
                          <span className="text-green-400 font-medium">✓ Enabled</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Message Authentication</span>
                          <span className="text-green-400 font-medium">✓ Active</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gray-900/30 rounded-xl border border-gray-800/50 p-6">
                      <h4 className="text-lg font-semibold text-white mb-4">Chat Statistics</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Total Messages</span>
                          <span className="text-white font-medium">{messages.filter(m => !parseFileMessage(m.plaintext).isFile).length}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Shared Files</span>
                          <span className="text-white font-medium">{messages.filter(m => parseFileMessage(m.plaintext).isFile).length}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Connection Status</span>
                          <span className={`font-medium ${
                            connectionStatus === "connected" ? "text-green-400" : 
                            connectionStatus === "connecting" ? "text-yellow-400" : 
                            "text-red-400"
                          }`}>
                            {connectionStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-800/50 p-6 bg-gradient-to-r from-gray-900/80 to-gray-900/50">
              {uploadingFile && (
                <div className="mb-4 p-4 bg-gradient-to-r from-blue-900/20 to-cyan-900/10 rounded-xl border border-blue-800/30">
                  <div className="flex items-center gap-3 text-blue-300">
                    <span className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
                    <span>Encrypting and uploading file...</span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!sessionKey || connectionStatus !== "connected" || uploadingFile}
                  className="px-5 py-3 bg-gray-800/50 hover:bg-gray-800/70 disabled:bg-gray-800/30 
                           disabled:cursor-not-allowed text-gray-300 hover:text-white rounded-xl 
                           border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 
                           flex items-center gap-2"
                  title="Send a secure file"
                >
                  <span className="text-xl">📎</span>
                  <span className="hidden sm:inline">Attach File</span>
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
                  className="hidden"
                  disabled={!sessionKey || connectionStatus !== "connected"}
                />

                <div className="flex-1 relative">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder={
                      connectionStatus === "connected" 
                        ? "Type your end-to-end encrypted message..." 
                        : "Establishing secure connection..."
                    }
                    disabled={connectionStatus !== "connected" || loading}
                    className="w-full px-5 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl 
                             focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/30 
                             outline-none transition-all text-white placeholder-gray-500 
                             disabled:bg-gray-800/30 disabled:cursor-not-allowed resize-none"
                    rows="1"
                    style={{ minHeight: "52px", maxHeight: "120px" }}
                  />
                  <div className="absolute right-3 bottom-3 text-xs text-gray-500">
                    ⏎ to send
                  </div>
                </div>

                <button
                  onClick={handleSend}
                  disabled={(!input.trim() && !uploadingFile) || !sessionKey || connectionStatus !== "connected" || loading}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 
                           disabled:from-gray-700 disabled:to-gray-600 text-white font-semibold rounded-xl 
                           shadow-lg hover:shadow-xl disabled:cursor-not-allowed transition-all duration-300 
                           flex items-center gap-2"
                >
                  {uploadingFile ? (
                    <>
                      <span className="animate-spin">⟳</span>
                      Uploading
                    </>
                  ) : (
                    <>
                      Send
                      <span className="text-lg">🚀</span>
                    </>
                  )}
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    End-to-end encrypted
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                    Client-side encryption
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                    Perfect forward secrecy
                  </span>
                </div>
                <div className="text-gray-500">
                  {connectionStatus === "connected" && "🔒 Secure"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-10px) scale(1.03); }
        }
        
        .particle {
          animation: float 8s ease-in-out infinite;
        }
        
        textarea {
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.1) transparent;
        }
        
        textarea::-webkit-scrollbar {
          width: 6px;
        }
        
        textarea::-webkit-scrollbar-track {
          background: transparent;
        }
        
        textarea::-webkit-scrollbar-thumb {
          background-color: rgba(255,255,255,0.1);
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
}