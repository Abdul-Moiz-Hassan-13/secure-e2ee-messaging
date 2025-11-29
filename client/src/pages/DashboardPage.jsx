import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function DashboardPage() {
  const navigate = useNavigate();

  // Redirect if not logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) navigate("/login");
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-white shadow-lg rounded-xl p-10">

        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
          Dashboard
        </h1>

        <p className="text-center text-gray-600 mb-8">
          Choose an action.
        </p>

        <div className="space-y-4">
          <DashButton to="/file-test" color="purple" label="Test File Encryption" />
          <DashButton to="/file-download" color="indigo" label="Test File Download + Decrypt" />
          <DashButton to="/chat-select" color="green" label="Open Chat" />
        </div>

      </div>
    </div>
  );
}

function DashButton({ to, color, label }) {
  const colorMap = {
    purple: "bg-purple-600 hover:bg-purple-700",
    indigo: "bg-indigo-600 hover:bg-indigo-700",
    green: "bg-green-600 hover:bg-green-700",
  };

  return (
    <Link
      to={to}
      className={`
        block w-full text-center py-3 rounded-xl font-semibold text-white 
        ${colorMap[color]} 
        transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5
      `}
    >
      {label}
    </Link>
  );
}
