import { useEffect, useRef, useState } from "react";
import { ensureSessionKeyForUsers } from "../crypto/keyExchange";
import { getDecryptedConversation } from "../api/fetchConversation";
import { sendEncryptedMessage } from "../api/messages";
import axiosClient from "../api/axiosClient";
import { useParams } from "react-router-dom";
import FileUpload from "./FileUpload";

export default function ChatPage({ currentUserId }) {
  const { peerId } = useParams(); // from URL
  const userId = currentUserId;
  const [sessionKey, setSessionKey] = useState(null);
  const [peer, setPeer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [showFileUpload, setShowFileUpload] = useState(false);
  const messagesEndRef = useRef(null);

  if (!peerId || peerId === "null" || peerId === "undefined") {
    console.error("❌ Invalid peerId:", peerId);
    return <div>Error: Invalid chat route.</div>;
  }

  // Scroll helper
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

  // Main: ensure session key and fetch conversation with auto-retry
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

        // 1) Get/derive secure session key
        const key = await ensureSessionKeyForUsers(userId, peerId);
        if (!mounted) return;

        setSessionKey(key);
        setConnectionStatus("connected");

        // 2) Load decrypted messages
        const msgs = await getDecryptedConversation(key, userId, peerId);
        if (!mounted) return;

        setMessages(msgs);
        retryCount = 0; // Reset retry count on success

      } catch (err) {
        if (!mounted) return;

        console.error("Error establishing secure session:", err);
        
        // Auto-retry for key exchange issues
        if ((err.message.includes("KEY_CONFIRM") || 
             err.message.includes("404") || 
             err.message.includes("not available")) && 
            retryCount < maxRetries) {
          
          retryCount++;
          setConnectionStatus(`retrying (${retryCount}/${maxRetries})`);
          
          console.log(`🔄 Auto-retry ${retryCount}/${maxRetries} in 2 seconds...`);
          
          // Exponential backoff
          const delay = Math.min(2000 * Math.pow(1.5, retryCount - 1), 10000);
          setTimeout(init, delay);
          return;
        }

        // Final failure
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
      mounted = false; // Cleanup on unmount
    };
  }, [userId, peerId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-refresh messages when connection is established
  useEffect(() => {
    if (!sessionKey || connectionStatus !== "connected") return;

    const interval = setInterval(async () => {
      try {
        const msgs = await getDecryptedConversation(sessionKey, userId, peerId);
        setMessages(msgs);
      } catch (err) {
        console.error("Error refreshing messages:", err);
      }
    }, 3000); // Refresh every 3 seconds

    return () => clearInterval(interval);
  }, [sessionKey, userId, peerId, connectionStatus]);

  async function handleSend() {
    if (!input.trim() || !sessionKey) return;

    try {
      await sendEncryptedMessage(sessionKey, userId, peerId, input, Date.now());
      setInput("");

      // Immediately refresh messages after sending
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

  const handleRetryConnection = () => {
    // Force re-initialization by triggering the effect again
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
            
            if (isSystem) {
              return (
                <div key={idx} className="flex justify-center">
                  <div className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm max-w-md text-center">
                    {msg.plaintext}
                  </div>
                </div>
              );
            }

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

        {/* File Upload Section */}
        <div className="border-t px-4 py-3 bg-white">
          {/* File Upload Toggle */}
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => setShowFileUpload(!showFileUpload)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              📁 {showFileUpload ? "Hide File Upload" : "Send Secure File"}
            </button>
            <span className="text-sm text-gray-500">
              Files are encrypted before upload
            </span>
          </div>

          {/* File Upload Component */}
          {showFileUpload && (
            <div className="mb-4">
              <FileUpload currentUserId={userId} peerId={peerId} />
            </div>
          )}

          {/* Message Input */}
          <div className="flex items-center gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                connectionStatus === "connected" 
                  ? "Type your message..." 
                  : "Establishing secure connection..."
              }
              disabled={connectionStatus !== "connected" || loading}
              className="flex-1 px-4 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && connectionStatus === "connected") {
                  handleSend();
                }
              }}
            />

            <button
              onClick={handleSend}
              disabled={!input.trim() || !sessionKey || connectionStatus !== "connected" || loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg shadow-md transition"
            >
              Send
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}