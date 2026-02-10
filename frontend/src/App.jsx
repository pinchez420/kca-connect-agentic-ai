import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ChatInterface from "./components/ChatInterface";
import LandingPage from "./components/LandingPage";
import Auth from "./components/Auth";
import UserProfile from "./components/UserProfile";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/auth"
        element={
          user ? <Navigate to="/chat" /> : <Auth />
        }
      />
      <Route
        path="/chat"
        element={
          user ? <ChatInterface /> : <Navigate to="/auth" />
        }
      />
      <Route
        path="/profile"
        element={
          user ? <UserProfile /> : <Navigate to="/auth" />
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="App min-h-screen bg-bg-primary text-text-primary transition-colors duration-300">
            <AppRoutes />
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
