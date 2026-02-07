import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllUsers } from "../api/users";
import { Link } from "react-router-dom";

export default function ChatSelectPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeUser, setActiveUser] = useState(null);

  const userId = localStorage.getItem("userId");
  const username = localStorage.getItem("username") || `User_${userId?.slice(-6)}`;

  useEffect(() => {
    loadUsers();
    
    const currentUserId = localStorage.getItem("userId");
    if (currentUserId) {
      setActiveUser({
        id: currentUserId,
        name: username
      });
    }
  }, []);

  async function loadUsers() {
    try {
      const data = await getAllUsers();
      const filteredUsers = data.filter((u) => u._id !== userId);
      setUsers(filteredUsers);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  function openChat(peerId, peerName) {
    if (!peerId || peerId === "null" || peerId === "undefined") {
      console.error("Invalid peerId attempted:", peerId);
      return;
    }
    
    localStorage.setItem("currentPeerId", peerId);
    localStorage.setItem("currentPeerName", peerName);
    navigate(`/chat/${peerId}`);
  }

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-teal-950 overflow-hidden relative">
      
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <div 
            key={i}
            className="particle absolute w-1 h-1 bg-teal-500/20 rounded-full animate-pulse"
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
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-teal-600/20 to-emerald-500/20 rounded-2xl border border-teal-500/30 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-emerald-400 rounded-xl flex items-center justify-center">
                <span className="text-white text-3xl">💬</span>
              </div>
            </div>
            
            <h1 className="text-4xl font-bold text-white mb-4">
              Secure <span className="bg-gradient-to-r from-teal-400 to-emerald-300 bg-clip-text text-transparent">Chat</span> Connections
            </h1>
            <p className="text-gray-400 max-w-md mx-auto text-lg">
              Select a user to start an end-to-end encrypted conversation
            </p>
          </div>

          <div className="bg-gray-900/50 backdrop-blur-xl rounded-3xl border border-gray-800/50 shadow-2xl overflow-hidden">
            
            <div className="p-8 border-b border-gray-800/50">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">Available Users</h2>
                  <p className="text-gray-400">Start an encrypted conversation</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm text-gray-400">You are</p>
                    <p className="text-white font-semibold">{username}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M12 14c-5 0-7 3-7 3v3h14v-3s-2-3-7-3z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-4 py-3 pl-12 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/30 outline-none transition-all text-white placeholder-gray-500"
                />
                <span className="absolute left-4 top-3.5 text-gray-500 text-lg">🔍</span>
              </div>
            </div>

            <div className="p-8">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                  <p className="text-teal-300 text-lg font-medium">Loading secure connections...</p>
                  <p className="text-gray-500 text-sm mt-2">Establishing encrypted channels</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-full bg-gray-800/50 border border-gray-700 flex items-center justify-center mx-auto mb-6">
                    <span className="text-3xl text-gray-500">👥</span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No users found</h3>
                  <p className="text-gray-400">Try a different search term or check back later</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredUsers.map((user) => (
                    <div
                      key={user._id}
                      className="group bg-gray-900/30 hover:bg-gray-800/50 border border-gray-800/50 hover:border-teal-500/30 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-teal-500/10"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-900/30 to-emerald-900/20 flex items-center justify-center">
                              <svg className="w-7 h-7 text-teal-400" fill="currentColor" viewBox="0 0 24 24">
                                <circle cx="12" cy="8" r="4" />
                                <path d="M12 14c-5 0-7 3-7 3v3h14v-3s-2-3-7-3z" />
                              </svg>
                            </div>
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-gray-900 flex items-center justify-center">
                              <span className="text-xs">✓</span>
                            </div>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white mb-1">{user.username}</h3>
                            <div className="flex items-center gap-3">
                              <span className="text-xs px-3 py-1 bg-gray-800/50 text-gray-300 rounded-full">
                                User ID: {user._id.slice(-8)}
                              </span>
                              <span className="flex items-center gap-1 text-xs text-teal-400">
                                <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse"></span>
                                Online
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => openChat(user._id, user.username)}
                          className="px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-teal-500/20 transition-all duration-300 flex items-center gap-2 group-hover:scale-105"
                        >
                          <span>💬</span>
                          Start Chat
                          <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </button>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-800/50 flex items-center gap-4">
                        <span className="text-sm text-gray-400 flex items-center gap-2">
                          <span className="text-blue-400">🔒</span>
                          End-to-end encrypted
                        </span>
                        <span className="text-sm text-gray-400 flex items-center gap-2">
                          <span className="text-purple-400">🛡️</span>
                          Perfect forward secrecy
                        </span>
                        <span className="text-sm text-gray-400 flex items-center gap-2">
                          <span className="text-green-400">⚡</span>
                          Real-time messaging
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 text-center">
            <div className="inline-flex flex-wrap justify-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-2 px-3 py-1 bg-gray-900/30 rounded-full border border-gray-800/50">
                <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse"></span>
                End-to-End Encrypted
              </span>
              <span className="flex items-center gap-2 px-3 py-1 bg-gray-900/30 rounded-full border border-gray-800/50">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                Perfect Forward Secrecy
              </span>
              <span className="flex items-center gap-2 px-3 py-1 bg-gray-900/30 rounded-full border border-gray-800/50">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                Self-Destructing Messages
              </span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-15px) scale(1.05); }
        }
        
        .particle {
          animation: float 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}