import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-gray-200 flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-white/90 backdrop-blur-xl shadow-xl rounded-2xl p-10 border border-gray-200">
        
        <h1 className="text-4xl font-extrabold text-center text-gray-800 mb-4 tracking-tight">
          E2EE Messaging Suite
        </h1>

        <p className="text-center text-gray-600 mb-10 text-lg">
          Secure communication starts here.
        </p>

        <div className="space-y-4">
          <HomeButton
            to="/register"
            color="blue"
            label="Register"
          />

          <HomeButton
            to="/login"
            color="indigo"
            label="Login"
          />
        </div>

      </div>
    </div>
  );
}

function HomeButton({ to, color, label }) {
  const colorMap = {
    blue: "bg-blue-600 hover:bg-blue-700",
    indigo: "bg-indigo-600 hover:bg-indigo-700",
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
