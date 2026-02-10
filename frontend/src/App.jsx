import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ChatInterface from "./components/ChatInterface";
import LandingPage from "./components/LandingPage";
import Auth from "./components/Auth";
import { ThemeProvider } from "./context/ThemeContext";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <ThemeProvider>
      <Router>
        <div className="App min-h-screen bg-bg-primary text-text-primary transition-colors duration-300">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/auth"
              element={
                isAuthenticated ? <Navigate to="/chat" /> : <Auth onLogin={() => setIsAuthenticated(true)} />
              }
            />
            <Route
              path="/chat"
              element={
                isAuthenticated ? <ChatInterface /> : <Navigate to="/auth" />
              }
            />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
