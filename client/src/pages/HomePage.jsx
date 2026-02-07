import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Shield,
  Lock,
  MessageSquare,
  Key,
  Users,
  Sparkles,
  ArrowRight,
  CheckCircle
} from "lucide-react";

export default function HomePage() {
  const [isVisible, setIsVisible] = useState(false);
  const [glitchEffect, setGlitchEffect] = useState(false);

  useEffect(() => {
    setIsVisible(true);

    setTimeout(() => {
      setGlitchEffect(true);
      setTimeout(() => setGlitchEffect(false), 300);
    }, 500);

    const handleParticles = () => {
      const particles = document.querySelectorAll('.particle');
      particles.forEach(p => {
        p.style.left = `${Math.random() * 100}%`;
        p.style.animationDelay = `${Math.random() * 2}s`;
      });
    };
    handleParticles();
  }, []);

  const features = [
    { icon: <Lock size={20} />, text: "End-to-End Encryption" },
    { icon: <Shield size={20} />, text: "Military-Grade Security" },
    { icon: <MessageSquare size={20} />, text: "Real-time Messaging" },
    { icon: <Key size={20} />, text: "Private Key Management" },
    { icon: <Users size={20} />, text: "Secure Group Chats" },
    { icon: <CheckCircle size={20} />, text: "Zero-Knowledge Protocol" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 overflow-hidden relative">

      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="particle absolute w-1 h-1 bg-blue-500/30 rounded-full animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          />
        ))}

        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />

        {glitchEffect && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/5 to-transparent animate-pulse" />
        )}
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12">
        <div className={`transition-all duration-1000 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>

          <div className="flex flex-col items-center mb-16">
            <div className="mb-10">
              <div className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-900/30 to-cyan-900/20 rounded-2xl border border-blue-500/20 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-ping absolute"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full relative"></div>
                  </div>
                  <span className="text-sm font-semibold text-green-400 tracking-wide">SECURE CONNECTION ESTABLISHED</span>
                </div>
                <div className="h-4 w-px bg-blue-500/30"></div>
                <span className="text-xs text-blue-300">TLS 1.3 • AES-256-GCM</span>
              </div>
            </div>

            <div className="text-center mb-10">
              <div className="mb-8">
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-4">
                  <span className="text-white">E2EE</span>
                  <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent ml-2">
                    Messaging Suite
                  </span>
                </h1>

                <div className="flex justify-center">
                  <div className="h-1 w-32 bg-gradient-to-r from-transparent via-blue-500 to-transparent rounded-full animate-pulse"></div>
                </div>
              </div>

              <div className="max-w-3xl mx-auto">
                <p className="text-2xl md:text-3xl text-gray-300 mb-8 font-light leading-snug">
                  Military-grade encrypted messaging platform where{" "}
                  <span className="text-white font-normal">your privacy is non-negotiable</span>
                </p>

                <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
                  Complete control over your digital conversations with end-to-end encryption
                  that even we cannot access. Your messages belong to you, and only you.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 text-sm text-gray-500 mt-8">
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>No Backdoors</span>
              </div>
              <div className="h-4 w-px bg-gray-700"></div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Open Source Audited</span>
              </div>
              <div className="h-4 w-px bg-gray-700"></div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>GDPR Compliant</span>
              </div>
            </div>
          </div>

          <div className="max-w-md mx-auto">
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-3xl border border-gray-800/50 shadow-2xl overflow-hidden">

              <div className="p-8 space-y-4">
                <ActionButton
                  to="/register"
                  label="Create Account"
                  description="Start your secure journey"
                  icon={<Users size={20} />}
                  gradient="from-blue-600 to-cyan-500"
                  animate
                />

                <ActionButton
                  to="/login"
                  label="Sign In"
                  description="Access your encrypted space"
                  icon={<Key size={20} />}
                  gradient="from-gray-800 to-gray-700"
                />
              </div>

              <div className="px-8 pb-8">
                <p className="text-sm text-gray-400 mb-4 text-center">✓ Trusted Features</p>
                <div className="grid grid-cols-2 gap-3">
                  {features.map((feature, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-3 rounded-lg bg-gray-900/30 hover:bg-gray-800/50 transition-all group"
                    >
                      <div className="text-blue-400 group-hover:text-cyan-400 transition-colors">
                        {feature.icon}
                      </div>
                      <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                        {feature.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-950/50 p-6 border-t border-gray-800/50">
                <div className="flex items-center justify-between text-sm">
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-md mx-auto mt-8">
            <div className="flex items-center justify-between text-sm text-gray-400">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">256-bit</div>
                <div>Encryption</div>
              </div>
              <div className="h-8 w-px bg-gray-800" />
              <div className="text-center">
                <div className="text-2xl font-bold text-white">Zero</div>
                <div>Data Storage</div>
              </div>
              <div className="h-8 w-px bg-gray-800" />
              <div className="text-center">
                <div className="text-2xl font-bold text-white">100%</div>
                <div>Private</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionButton({ to, label, description, icon, gradient, animate = false }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link
      to={to}
      className={`relative overflow-hidden group block rounded-2xl transition-all duration-300 hover:scale-[1.02] ${animate ? 'hover:shadow-xl hover:shadow-blue-500/20' : ''
        }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {animate && (
        <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-500 from-blue-500/10 via-cyan-500/10 to-blue-500/10"
          style={{ animation: isHovered ? 'shimmer 2s infinite' : 'none' }} />
      )}

      <div className={`relative bg-gradient-to-r ${gradient} p-6 rounded-2xl transition-all duration-300`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
              <div className="text-white">
                {icon}
              </div>
            </div>
            <div className="text-left">
              <div className="text-xl font-bold text-white mb-1">{label}</div>
              <div className="text-sm text-white/80">{description}</div>
            </div>
          </div>
          <ArrowRight
            size={20}
            className={`text-white transition-transform duration-300 ${isHovered ? 'translate-x-2' : ''
              }`}
          />
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
    animation: float 6s ease-in-out infinite;
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0) scale(1); }
    50% { transform: translateY(-20px) scale(1.1); }
  }
  
  .glitch-text {
    position: relative;
    animation: glitch 5s infinite;
  }
  
  @keyframes glitch {
    0% { transform: translate(0); }
    2% { transform: translate(-2px, 2px); }
    4% { transform: translate(-2px, -2px); }
    6% { transform: translate(2px, 2px); }
    8% { transform: translate(2px, -2px); }
    10% { transform: translate(0); }
    100% { transform: translate(0); }
  }
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}