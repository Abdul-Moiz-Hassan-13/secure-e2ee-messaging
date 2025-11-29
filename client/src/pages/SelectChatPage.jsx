import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllUsers } from "../api/users";

export default function ChatSelectPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const userId = localStorage.getItem("userId");

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const data = await getAllUsers();
      setUsers(data.filter((u) => u._id !== userId)); // exclude yourself
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  function openChat(peerId) {
    navigate(`/chat/${peerId}`);
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-white shadow-xl rounded-2xl p-10">

        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Select a User to Chat With
        </h1>

        {loading && (
          <p className="text-center text-gray-600">Loading users...</p>
        )}

        <div className="space-y-3">
          {users.map((u) => (
            <div
              key={u._id}
              className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
            >
              <span className="font-semibold text-gray-800">
                {u.username}
              </span>

              <button
                onClick={() => openChat(u._id)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition shadow-sm"
              >
                Chat
              </button>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
