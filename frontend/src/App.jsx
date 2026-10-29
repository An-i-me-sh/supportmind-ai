import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Documents from "./pages/Documents";
import Chat from "./pages/Chat";
import Tickets from "./pages/Tickets";

// Route Guard for Authenticated Users
function AuthGuard({ children, requireAdmin = false }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user.role !== "admin") {
    // Customers are redirected from administrative views to the Customer Chat page
    return <Navigate to="/chat" replace />;
  }

  return children;
}

// Redirect helper for root route
function RootRedirect() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Admin goes to dashboard, customer goes directly to Chat console
  return user.role === "admin" ? <Navigate to="/" replace /> : <Navigate to="/chat" replace />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route
          path="/"
          element={
            <AuthGuard requireAdmin={true}>
              <Dashboard />
            </AuthGuard>
          }
        />
        
        <Route
          path="/documents"
          element={
            <AuthGuard requireAdmin={true}>
              <Documents />
            </AuthGuard>
          }
        />
        
        <Route
          path="/chat"
          element={
            <AuthGuard>
              <Chat />
            </AuthGuard>
          }
        />

        <Route
          path="/tickets"
          element={
            <AuthGuard>
              <Tickets />
            </AuthGuard>
          }
        />

        {/* Catch-all root redirect */}
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </Router>
  );
}
