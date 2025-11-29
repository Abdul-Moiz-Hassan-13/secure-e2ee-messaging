import { useState } from "react";
import axios from "../api/axiosClient";
import { 
  generateIdentityKeyPair, 
  exportPublicKey, 
  saveIdentityKeyPair 
} from "../crypto/keys";
import { useNavigate } from "react-router-dom";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();

    setMessage("");
    setIsSuccess(false);
    setLoading(true);

    try {
      // 1. First generate the identity key pair
      const keyPair = await generateIdentityKeyPair();
      
      // 2. Export the public key to send to the server
      const publicKeyJwk = await exportPublicKey(keyPair.publicKey);

      // 3. Register with the server and get the user ID
      const res = await axios.post("/auth/register", {
        username,
        password,
        publicIdentityKey: publicKeyJwk,
      });

      // 4. NOW save the identity keys with the user ID we received
      await saveIdentityKeyPair(res.data.userId, {
        privateKey: keyPair.privateKey,
        publicKeyJwk: publicKeyJwk
      });

      console.log(`✅ Identity keys saved for user ${res.data.userId}`);

      setIsSuccess(true);
      setMessage("Registration successful. Redirecting to login...");
      setTimeout(() => navigate("/login"), 1200);

    } catch (error) {
      console.error(error);

      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Registration failed.";

      setIsSuccess(false);
      setMessage(apiMessage);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-8 border border-gray-200">
        
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Create Your Account
        </h2>

        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Username
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Password
            </label>
            <input
              type="password"
              className="w-full px-4 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`
              w-full py-3 text-white font-semibold rounded-xl
              shadow-md hover:shadow-lg transition-all
              flex items-center justify-center gap-2
              ${loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}
            `}
          >
            {loading ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Processing...
              </>
            ) : (
              "Register"
            )}
          </button>
        </form>

        {message && (
          <p
            className={`mt-5 text-center font-medium ${
              isSuccess ? "text-green-600" : "text-red-600"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}