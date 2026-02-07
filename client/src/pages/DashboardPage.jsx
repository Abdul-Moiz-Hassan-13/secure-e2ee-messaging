import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [sessionTime, setSessionTime] = useState("00:00");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("username");
    
    if (!token) {
      navigate("/login");
      return;
    }

    if (storedUser) {
      setUsername(storedUser);
    } else {
      const userId = localStorage.getItem("userId");
      setUsername(userId ? `User_${userId.slice(-6)}` : "Secure User");
    }

    setIsLoading(false);

    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const minutes = Math.floor(elapsed / 60000).toString().padStart(2, '0');
      const seconds = Math.floor((elapsed % 60000) / 1000).toString().padStart(2, '0');
      setSessionTime(`${minutes}:${seconds}`);
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    navigate("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-purple-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-purple-950 overflow-hidden relative">
      
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div 
            key={i}
            className="particle absolute w-1 h-1 bg-purple-500/20 rounded-full animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}
        
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        
        <div className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-500 rounded-xl flex items-center justify-center shadow-xl shadow-purple-500/20">
              <span className="text-white text-2xl">🛡️</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Secure Dashboard</h2>
              <p className="text-sm text-gray-400">E2EE Messaging Suite</p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-900/50 backdrop-blur-sm text-gray-300 hover:text-white rounded-xl border border-gray-800/50 hover:border-gray-700/50 transition-all duration-300 flex items-center gap-2 group"
          >
            <span>🚪</span>
            <span className="font-medium">Logout</span>
          </button>
        </div>

        <div className="max-w-4xl mx-auto">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-800/50 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-900/30 to-blue-500/20 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M12 14c-5 0-7 3-7 3v3h14v-3s-2-3-7-3z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Active User</p>
                  <p className="text-xl font-bold text-white">{username}</p>
                </div>
              </div>
              <div className="text-sm text-gray-400">Session: <span className="text-green-400 font-mono">{sessionTime}</span></div>
            </div>
            
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-800/50 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-900/30 to-green-500/20 flex items-center justify-center">
                  <span className="text-green-400 text-2xl">🔒</span>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Security Status</p>
                  <p className="text-xl font-bold text-white">Active</p>
                </div>
              </div>
              <div className="text-sm text-gray-400 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                All systems secure
              </div>
            </div>
            
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl border border-gray-800/50 p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-900/30 to-purple-500/20 flex items-center justify-center">
                  <span className="text-purple-400 text-2xl">⚡</span>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Encryption</p>
                  <p className="text-xl font-bold text-white">AES-256</p>
                </div>
              </div>
              <div className="text-sm text-gray-400">Perfect Forward Secrecy</div>
            </div>
          </div>

          <div className="bg-gray-900/50 backdrop-blur-xl rounded-3xl border border-gray-800/50 shadow-2xl overflow-hidden">
            
            <div className="p-8 border-b border-gray-800/50">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-white">Secure Operations Center</h1>
                  <p className="text-gray-400 mt-2">Choose your encrypted operation</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-500 rounded-2xl flex items-center justify-center">
                  <span className="text-white text-2xl">🚀</span>
                </div>
              </div>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DashButton 
                  to="/file-test" 
                  icon="📁"
                  title="File Encryption Test"
                  description="Encrypt and decrypt files with military-grade security"
                  gradient="from-blue-600 to-cyan-500"
                  animate
                />
                
                <DashButton 
                  to="/chat-select" 
                  icon="💬"
                  title="Secure Chat"
                  description="Real-time encrypted messaging with perfect forward secrecy"
                  gradient="from-green-600 to-emerald-500"
                  animate
                />
              
              </div>
              
              <div className="mt-12 pt-8 border-t border-gray-800/50">
                <div className="flex flex-wrap justify-center gap-4 text-sm">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-900/30 rounded-full border border-gray-800/50">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                    <span className="text-gray-300">End-to-End Encrypted</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-900/30 rounded-full border border-gray-800/50">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-gray-300">Zero-Knowledge Protocol</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-900/30 rounded-full border border-gray-800/50">
                    <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                    <span className="text-gray-300">Client-Side Processing</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashButton({ to, icon, title, description, gradient, animate = false }) {
  return (
    <Link
      to={to}
      className={`block bg-gradient-to-r ${gradient} rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 group relative overflow-hidden ${animate ? 'hover:shadow-blue-500/20' : ''}`}
    >
      {animate && (
        <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-500 from-white/10 via-transparent to-white/10" 
             style={{ animation: 'shimmer 2s infinite' }} />
      )}
      
      <div className="relative z-10">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <span className="text-white text-2xl">{icon}</span>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-1">{title}</h3>
            <p className="text-white/80 text-sm">{description}</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-white/60 text-sm">Click to access
          </span>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-1 transition-transform">
            <span className="text-white">→</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

const styles = `
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
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}