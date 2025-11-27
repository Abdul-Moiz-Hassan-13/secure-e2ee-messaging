import { useState } from "react";
import axios from "../api/axiosClient";
import { 
  generateIdentityKeyPair, 
  exportPublicKey, 
  saveIdentityKeyPair 
} from "../crypto/keys";

function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      // 1. Generate ECC identity key pair
      const keyPair = await generateIdentityKeyPair();

      // 2. Save private + public identity key locally
      await saveIdentityKeyPair(keyPair);

      // 3. Export public key to JWK
      const publicKeyJwk = await exportPublicKey(keyPair.publicKey);

      // 4. Send data to server
      const res = await axios.post("/auth/register", {
        username,
        password,
        publicIdentityKey: publicKeyJwk
      });

      setMessage("Registration successful!");
    } catch (error) {
      console.error(error);
      setMessage("Registration failed!");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Register</h2>
      <form onSubmit={handleRegister}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        /><br /><br />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        /><br /><br />

        <button type="submit">Register</button>
      </form>

      <p>{message}</p>
    </div>
  );
}

export default RegisterPage;
