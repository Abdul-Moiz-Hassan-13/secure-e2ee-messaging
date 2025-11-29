import { useState } from "react";
import axios from "../api/axiosClient";
import { useNavigate } from "react-router-dom";
import { ensureIdentityKeysExist } from "../crypto/ensureIdentity";

export default function LoginPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const res = await axios.post("/auth/login", {
        username,
        password,
      });

      // Store token if needed
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("userId", res.data.userId);

      await ensureIdentityKeysExist(res.data.userId);

      setMessage("Login successful, redirecting to dashboard...");

      // Redirect to homepage or chat
    setTimeout(() => navigate("/dashboard"), 800);
    } catch (error) {
      const apiMessage =
        error?.response?.data?.error ||
        "Login failed.";

      setMessage(apiMessage);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-8 border border-gray-200">

        <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Login
        </h2>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Username
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border rounded-lg shadow-sm
              focus:ring-2 focus:ring-gray-500 focus:outline-none"
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
              className="w-full px-4 py-2 border rounded-lg shadow-sm
              focus:ring-2 focus:ring-gray-500 focus:outline-none"
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
              ${loading ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"}
            `}
          >
            {loading ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Processing...
              </>
            ) : (
              "Login"
            )}
          </button>
        </form>

        {message && (
          <p
            className={`mt-5 text-center font-medium ${
              message.includes("successful")
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
