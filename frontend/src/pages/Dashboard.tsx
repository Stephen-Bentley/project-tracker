import React from "react";
import { useNavigate } from "react-router-dom";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem("role"); // 'admin' or 'user'

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/login");
  };

  const goToProjects = () => {
    navigate("/projects");
  };

  const goToAdmin = () => {
    navigate("/admin/projects");
  };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ color: "#16a34a" }}>Dashboard</h1>
      <p>Welcome! Choose where to go next:</p>

      <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
        <button
          onClick={goToProjects}
          style={{
            padding: "8px 16px",
            backgroundColor: "#16a34a",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          My Projects
        </button>

        {role === "admin" && (
          <button
            onClick={goToAdmin}
            style={{
              padding: "8px 16px",
              backgroundColor: "#15803d",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Admin Projects
          </button>
        )}

        <button
          onClick={logout}
          style={{
            padding: "8px 16px",
            backgroundColor: "#dc2626",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
