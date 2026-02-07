import { useState } from "react";
import axios from "../api/axiosClient";
import { 
  generateIdentityKeyPair, 
  exportPublicKey, 
  saveIdentityKeyPair 
} from "../crypto/keys";
import { useNavigate, Link } from "react-router-dom";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [keyGenerationStep, setKeyGenerationStep] = useState(0);
  
  const navigate = useNavigate();

  // Password strength checker
  const checkPasswordStrength = (pass) => {
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    setPasswordStrength(score);
  };

  const handlePasswordChange = (e) => {
    const pass = e.target.value;
    setPassword(pass);
    checkPasswordStrength(pass);
  };

  const getStrengthColor = () => {
    if (passwordStrength === 0) return "bg-gray-300";
    if (passwordStrength === 1) return "bg-red-500";
    if (passwordStrength === 2) return "bg-orange-500";
    if (passwordStrength === 3) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStrengthText = () => {
    if (passwordStrength === 0) return "Very Weak";
    if (passwordStrength === 1) return "Weak";
    if (passwordStrength === 2) return "Fair";
    if (passwordStrength === 3) return "Good";
    return "Strong";
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      setIsSuccess(false);
      return;
    }

    if (passwordStrength < 2) {
      setMessage("Please use a stronger password");
      setIsSuccess(false);
      return;
    }

    setMessage("");
    setIsSuccess(false);
    setLoading(true);

    try {
      // Step 1: Generating encryption keys
      setKeyGenerationStep(1);
      setMessage("Generating encryption keys...");
      
      const keyPair = await generateIdentityKeyPair();
      
      // Step 2: Exporting public key
      setKeyGenerationStep(2);
      setMessage("Securing your identity...");
      
      const publicKeyJwk = await exportPublicKey(keyPair.publicKey);

      // Step 3: Registering with server
      setKeyGenerationStep(3);
      setMessage("Creating your secure account...");

      const res = await axios.post("/auth/register", {
        username,
        password,
        publicIdentityKey: publicKeyJwk,
      });

      // Step 4: Saving keys locally
      setKeyGenerationStep(4);
      setMessage("Securing your encryption keys...");

      await saveIdentityKeyPair(res.data.userId, {
        privateKey: keyPair.privateKey,
        publicKeyJwk: publicKeyJwk
      });

      // Set token and userId for authenticated request
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userId", res.data.userId);

      console.log(`Identity keys saved for user ${res.data.userId}`);

      // Step 5: Upload prekeys to server
      setKeyGenerationStep(5);
      setMessage("Uploading session prekeys...");

      await generateAndUploadPreKeys(res.data.userId);

      // Success
      setKeyGenerationStep(6);
      setIsSuccess(true);
      setMessage("✓ Account created successfully! Redirecting...");
      
      setTimeout(() => navigate("/login"), 1500);

    } catch (error) {
      console.error(error);

      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Registration failed. Please try again.";

      setIsSuccess(false);
      setMessage(`✗ ${apiMessage}`);
      setKeyGenerationStep(0);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 overflow-hidden relative">
      
      {/* Animated Background Elements */}
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
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      {/* Back Button - Top Left */}
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
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600/20 to-cyan-500/20 rounded-2xl border border-blue-500/30 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center">
                <span className="text-white text-2xl">🔐</span>
              </div>
            </div>
            
            <h1 className="text-4xl font-bold text-white mb-4">
              Create Your <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Secure Account</span>
            </h1>
            <p className="text-gray-400 max-w-md mx-auto text-lg">
              Join our encrypted network. Your privacy starts here.
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-3xl border border-gray-800/50 shadow-2xl overflow-hidden">
            
            {/* Progress Indicator */}
            {loading && keyGenerationStep > 0 && (
              <div className="px-8 pt-8">
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-400 mb-2">
                    <span>Encryption Setup</span>
                    <span className="text-cyan-300 font-medium">{keyGenerationStep}/5</span>
                  </div>
                  <div className="h-2 bg-gray-800/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
                      style={{ width: `${(keyGenerationStep / 5) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="p-8">
              {/* Security Badge */}
              <div className="flex items-center justify-between mb-8 p-4 bg-gradient-to-r from-blue-900/20 to-cyan-900/10 rounded-xl border border-blue-800/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-400/20 border border-blue-500/30 flex items-center justify-center">
                    <span className="text-blue-400 text-lg">🔒</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">End-to-End Encrypted</h3>
                    <p className="text-sm text-gray-400">Your data never leaves your device unencrypted</p>
                  </div>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              </div>

              <form onSubmit={handleRegister} className="space-y-6">
                {/* Username Field */}
                <div className="space-y-2">
                  <label className="block text-gray-300 font-medium">
                    Username <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/30 outline-none transition-all text-white placeholder-gray-500"
                      placeholder="Choose a unique username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      disabled={loading}
                    />
                    <div className="absolute right-3 top-3 text-gray-500">
                      @
                    </div>
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label className="block text-gray-300 font-medium">
                    Password <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/30 outline-none transition-all text-white placeholder-gray-500 pr-12"
                      placeholder="Create a strong password"
                      value={password}
                      onChange={handlePasswordChange}
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-3 text-gray-500 hover:text-gray-300 transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>

                  {/* Password Strength */}
                  {password && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Password strength:</span>
                        <span className={`font-medium ${
                          passwordStrength <= 1 ? "text-red-400" :
                          passwordStrength === 2 ? "text-orange-400" :
                          passwordStrength === 3 ? "text-yellow-400" : "text-green-400"
                        }`}>
                          {getStrengthText()}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                          style={{ width: `${(passwordStrength / 4) * 100}%` }}
                        />
                      </div>
                      <ul className="text-xs text-gray-500 space-y-1">
                        <li className={`flex items-center gap-2 ${password.length >= 8 ? "text-green-400" : ""}`}>
                          {password.length >= 8 ? "✓" : "○"} At least 8 characters
                        </li>
                        <li className={`flex items-center gap-2 ${/[A-Z]/.test(password) ? "text-green-400" : ""}`}>
                          {/[A-Z]/.test(password) ? "✓" : "○"} Uppercase letter
                        </li>
                        <li className={`flex items-center gap-2 ${/[0-9]/.test(password) ? "text-green-400" : ""}`}>
                          {/[0-9]/.test(password) ? "✓" : "○"} Number
                        </li>
                        <li className={`flex items-center gap-2 ${/[^A-Za-z0-9]/.test(password) ? "text-green-400" : ""}`}>
                          {/[^A-Za-z0-9]/.test(password) ? "✓" : "○"} Special character
                        </li>
                      </ul>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <label className="block text-gray-300 font-medium">
                    Confirm Password <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      className={`w-full px-4 py-3 bg-gray-800/50 border rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/30 outline-none transition-all text-white placeholder-gray-500 pr-12 ${
                        confirmPassword && password !== confirmPassword 
                          ? "border-red-500 ring-2 ring-red-500/20" 
                          : "border-gray-700"
                      }`}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-3 text-gray-500 hover:text-gray-300 transition-colors"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-sm text-red-400 flex items-center gap-2">
                      <span>⚠️</span> Passwords do not match
                    </p>
                  )}
                </div>

                {/* Terms Checkbox */}
                <div className="flex items-start gap-3 p-4 bg-gray-900/30 rounded-xl border border-gray-800/50">
                  <input
                    type="checkbox"
                    id="terms"
                    required
                    className="mt-1 bg-gray-800 border-gray-700 text-blue-500 focus:ring-blue-500/50"
                    disabled={loading}
                  />
                  <label htmlFor="terms" className="text-sm text-gray-400">
                    I understand that my messages are end-to-end encrypted and 
                    <span className="font-medium text-gray-300"> I am responsible for backing up my encryption keys</span>. 
                    Losing keys means permanent loss of message access.
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className={`
                    w-full py-4 text-white font-bold rounded-xl
                    shadow-lg hover:shadow-xl transition-all duration-300
                    flex items-center justify-center gap-3 text-lg
                    relative overflow-hidden group
                    ${loading 
                      ? "bg-gradient-to-r from-blue-700/50 to-cyan-700/50 cursor-not-allowed border border-blue-800/30" 
                      : "bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 border border-blue-500/30"
                    }
                  `}
                >
                  {loading ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Securing Your Account...
                    </>
                  ) : (
                    <>
                      <span className="relative z-10">🔐 Create Secure Account</span>
                      <span className="relative z-10 group-hover:translate-x-1 transition-transform">→</span>
                    </>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                </button>
              </form>

              {/* Status Message */}
              {message && (
                <div className={`mt-6 p-4 rounded-xl border ${
                  isSuccess 
                    ? "bg-green-900/20 border-green-800/30 text-green-300" 
                    : "bg-red-900/20 border-red-800/30 text-red-300"
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{isSuccess ? "✅" : "❌"}</span>
                    <p className="font-medium">{message}</p>
                  </div>
                  {loading && keyGenerationStep > 0 && (
                    <p className="text-sm opacity-80 mt-2 text-gray-400">
                      {keyGenerationStep === 1 && "Generating your unique encryption keys..."}
                      {keyGenerationStep === 2 && "Exporting public key for secure communication..."}
                      {keyGenerationStep === 3 && "Registering with secure server..."}
                      {keyGenerationStep === 4 && "Storing encryption keys locally..."}
                      {keyGenerationStep === 5 && "All security measures in place!"}
                    </p>
                  )}
                </div>
              )}

              {/* Login Link */}
              <div className="mt-8 pt-6 border-t border-gray-800/50 text-center">
                <p className="text-gray-400">
                  Already have an account?{" "}
                  <Link 
                    to="/login" 
                    className="font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    Sign in here
                  </Link>
                </p>
              </div>
            </div>
          </div>

          {/* Security Footer */}
          <div className="mt-8 text-center">
            <div className="inline-flex flex-wrap justify-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-2 px-3 py-1 bg-gray-900/30 rounded-full border border-gray-800/50">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                AES-256 Encryption
              </span>
              <span className="flex items-center gap-2 px-3 py-1 bg-gray-900/30 rounded-full border border-gray-800/50">
                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></span>
                Zero-Knowledge Protocol
              </span>
              <span className="flex items-center gap-2 px-3 py-1 bg-gray-900/30 rounded-full border border-gray-800/50">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                Client-Side Encryption
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add to your global CSS or style tag
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

// Add styles to document head
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}