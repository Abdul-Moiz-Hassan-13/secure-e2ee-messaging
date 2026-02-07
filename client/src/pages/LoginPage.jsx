import { useState } from "react";
import axios from "../api/axiosClient";
import { useNavigate, Link } from "react-router-dom";
import { ensureIdentityKeysExist } from "../crypto/ensureIdentity";

export default function LoginPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginStep, setLoginStep] = useState(0);

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    setLoginStep(0);

    try {
      setLoginStep(1);
      setMessage("Authenticating credentials...");

      const res = await axios.post("/auth/login", {
        username,
        password,
      });

      setLoginStep(2);
      setMessage("Establishing secure session...");

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userId", res.data.userId);
      localStorage.setItem("username", res.data.username);

      setLoginStep(3);
      setMessage("Loading encryption keys...");

      await ensureIdentityKeysExist(res.data.userId);

      setLoginStep(4);
      setMessage("✓ Secure login successful! Redirecting...");

      setTimeout(() => navigate("/dashboard"), 1200);

    } catch (error) {
      const apiMessage =
        error?.response?.data?.error ||
        "Login failed. Please check your credentials.";

      setMessage(`✗ ${apiMessage}`);
      setLoginStep(0);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 overflow-hidden relative">
      
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <div 
            key={i}
            className="particle absolute w-1 h-1 bg-blue-500/20 rounded-full animate-pulse"
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
          to="/" 
          className="flex items-center gap-2 px-4 py-2 bg-gray-900/50 backdrop-blur-sm text-gray-300 hover:text-white rounded-xl border border-gray-800/50 hover:border-gray-700/50 transition-all duration-300 group"
        >
          <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
          <span className="font-medium">Back to Home</span>
        </Link>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 flex items-center justify-center min-h-screen">
        <div className="w-full max-w-lg">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-600/20 to-purple-500/20 rounded-2xl border border-indigo-500/30 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-400 rounded-xl flex items-center justify-center">
                <span className="text-white text-2xl">🔑</span>
              </div>
            </div>
            
            <h1 className="text-4xl font-bold text-white mb-4">
              Welcome <span className="bg-gradient-to-r from-indigo-400 to-purple-300 bg-clip-text text-transparent">Back</span>
            </h1>
            <p className="text-gray-400 max-w-md mx-auto text-lg">
              Access your encrypted messaging space
            </p>
          </div>

          <div className="bg-gray-900/50 backdrop-blur-xl rounded-3xl border border-gray-800/50 shadow-2xl overflow-hidden">
            
            {loading && loginStep > 0 && (
              <div className="px-8 pt-8">
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-400 mb-2">
                    <span>Secure Login Process</span>
                    <span className="text-purple-300 font-medium">{loginStep}/4</span>
                  </div>
                  <div className="h-2 bg-gray-800/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                      style={{ width: `${(loginStep / 4) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="p-8">
              <div className="flex items-center justify-between mb-8 p-4 bg-gradient-to-r from-indigo-900/20 to-purple-900/10 rounded-xl border border-indigo-800/30">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-400 rounded-full flex items-center justify-center animate-pulse">
                      <span className="text-white text-sm">✓</span>
                    </div>
                    <div className="absolute -inset-1 border-2 border-green-500/30 rounded-full animate-ping"></div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Secure Gateway</h3>
                    <p className="text-sm text-gray-400">Encrypted connection established</p>
                  </div>
                </div>
                <div className="text-xs px-3 py-1 bg-green-900/30 text-green-400 rounded-full border border-green-800/50">
                  TLS 1.3
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-gray-300 font-medium">
                    Username <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/30 outline-none transition-all text-white placeholder-gray-500"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      disabled={loading}
                    />
                    <div className="absolute right-3 top-3">
                      <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="8" r="4" />
                        <path d="M12 14c-5 0-7 3-7 3v3h14v-3s-2-3-7-3z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-gray-300 font-medium">
                      Password <span className="text-red-400">*</span>
                    </label>
                    <Link 
                      to="/forgot-password" 
                      className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/30 outline-none transition-all text-white placeholder-gray-500 pr-12"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-3 text-gray-500 hover:text-gray-300 transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      {showPassword ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="remember"
                    className="bg-gray-800 border-gray-700 text-indigo-500 focus:ring-indigo-500/50"
                    disabled={loading}
                  />
                  <label htmlFor="remember" className="text-sm text-gray-400">
                    Remember this device (30 days)
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`
                    w-full py-4 text-white font-bold rounded-xl
                    shadow-lg hover:shadow-xl transition-all duration-300
                    flex items-center justify-center gap-3 text-lg
                    relative overflow-hidden group
                    ${loading 
                      ? "bg-gradient-to-r from-indigo-700/50 to-purple-700/50 cursor-not-allowed border border-indigo-800/30" 
                      : "bg-gradient-to-r from-indigo-600 to-purple-500 hover:from-indigo-700 hover:to-purple-600 border border-indigo-500/30"
                    }
                  `}
                >
                  {loading ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Securing Access...
                    </>
                  ) : (
                    <>
                      <span className="relative z-10">🚀 Access Secure Dashboard</span>
                      <span className="relative z-10 group-hover:translate-x-1 transition-transform">→</span>
                    </>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                </button>
              </form>

              {message && (
                <div className={`mt-6 p-4 rounded-xl border ${
                  message.includes("successful") || message.includes("✓")
                    ? "bg-green-900/20 border-green-800/30 text-green-300" 
                    : loginStep > 0
                    ? "bg-indigo-900/20 border-indigo-800/30 text-indigo-300"
                    : "bg-red-900/20 border-red-800/30 text-red-300"
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {message.includes("successful") || message.includes("✓") ? "✅" : loginStep > 0 ? "⏳" : "❌"}
                    </span>
                    <p className="font-medium">{message}</p>
                  </div>
                  {loading && loginStep > 0 && (
                    <p className="text-sm opacity-80 mt-2 text-gray-400">
                      {loginStep === 1 && "Verifying your credentials..."}
                      {loginStep === 2 && "Establishing secure session..."}
                      {loginStep === 3 && "Loading encryption keys..."}
                      {loginStep === 4 && "All security checks passed!"}
                    </p>
                  )}
                </div>
              )}

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-800/50"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-gray-900 text-gray-500">New to secure messaging?</span>
                </div>
              </div>

              <div className="text-center">
                <Link 
                  to="/register" 
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800/50 hover:bg-gray-800/70 text-gray-300 hover:text-white rounded-xl border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 group"
                >
                  <span className="text-lg">✨</span>
                  <span className="font-medium">Create New Secure Account</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <div className="inline-flex flex-wrap justify-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-2 px-3 py-1 bg-gray-900/30 rounded-full border border-gray-800/50">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
                Session Encrypted
              </span>
              <span className="flex items-center gap-2 px-3 py-1 bg-gray-900/30 rounded-full border border-gray-800/50">
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></span>
                Keys Local Storage
              </span>
              <span className="flex items-center gap-2 px-3 py-1 bg-gray-900/30 rounded-full border border-gray-800/50">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                No Trackers
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
  
  .particle {
    animation: float 6s ease-in-out infinite;
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0) scale(1); }
    50% { transform: translateY(-20px) scale(1.1); }
  }
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}