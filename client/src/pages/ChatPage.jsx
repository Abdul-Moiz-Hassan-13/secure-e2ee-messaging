import { useEffect, useRef, useState } from "react";
import { ensureSessionKeyForUsers } from "../crypto/keyExchange";
import { getDecryptedConversation } from "../api/fetchConversation";
import { sendEncryptedMessage } from "../api/messages";
import axiosClient from "../api/axiosClient";
import { useParams } from "react-router-dom";

export default function ChatPage({ currentUserId }) {
  const { peerId } = useParams();     // from URL
  const userId = currentUserId;      
  const [sessionKey, setSessionKey] = useState(null);
  const [peer, setPeer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

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

  // Main: ensure session key and fetch conversation
  useEffect(() => {
    async function init() {
      try {
        // 1) Get/derive secure session key
        const key = await ensureSessionKeyForUsers(userId, peerId);
        setSessionKey(key);

        // 2) Load decrypted messages
        const msgs = await getDecryptedConversation(key, userId, peerId);
        setMessages(msgs);

      } catch (err) {
        console.error("Error establishing secure session:", err);
      }
    }

    init();
  }, [userId, peerId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || !sessionKey) return;

    try {
      await sendEncryptedMessage(sessionKey, userId, peerId, input, Date.now());
      setInput("");

      const msgs = await getDecryptedConversation(sessionKey, userId, peerId);
      setMessages(msgs);

    } catch (err) {
      console.error("Send error:", err);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl bg-white shadow-xl rounded-2xl border border-gray-200 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              Chat with {peer ? peer.username : "Loading..."}
            </h2>
            <p className="text-sm text-gray-500">Secure End-to-End Encryption</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50">
          {messages.map((msg, idx) => {
            const isMine = msg.senderId === userId;
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

        {/* Input */}
        <div className="border-t px-4 py-3 bg-white">
          <div className="flex items-center gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />

            <button
              onClick={handleSend}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md transition"
            >
              Send
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
