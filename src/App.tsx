import React, { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { User } from "./types";
import Auth from "./components/Auth";
import ChatLayout from "./components/ChatLayout";
import { MessageSquareCode } from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Auto-login if code exists in localStorage
  useEffect(() => {
    const autoLogin = async () => {
      const savedCode = localStorage.getItem("chat_user_code");
      const savedProfileStr = localStorage.getItem("chat_user_profile");
      if (savedCode) {
        try {
          const userRef = doc(db, "users", savedCode.toUpperCase());
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data() as User;
            localStorage.setItem("chat_user_profile", JSON.stringify(userData));
            setCurrentUser(userData);
          } else {
            // Stale code, remove it
            localStorage.removeItem("chat_user_code");
            localStorage.removeItem("chat_user_profile");
          }
        } catch (err) {
          console.error("Auto-login failed:", err);
          // Fallback to local profile if offline
          if (savedProfileStr) {
            try {
              const localUser = JSON.parse(savedProfileStr) as User;
              setCurrentUser(localUser);
              console.log("Loaded cached profile due to offline status:", localUser);
            } catch (e) {
              console.error("Failed to parse cached profile:", e);
            }
          }
        }
      }
      setCheckingAuth(false);
    };

    autoLogin();
  }, []);

  const handleLogin = (user: User) => {
    localStorage.setItem("chat_user_profile", JSON.stringify(user));
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem("chat_user_code");
    localStorage.removeItem("chat_user_profile");
    setCurrentUser(null);
  };

  if (checkingAuth) {
    return (
      <div className="h-screen w-screen bg-[#0B0E11] flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-500/20 mb-4 animate-bounce">
            <MessageSquareCode className="h-8 w-8" />
          </div>
          <p className="text-gray-400 font-medium text-sm">Verifying session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0B0E11] min-h-screen text-gray-200 antialiased font-sans relative">
      {/* Overlay Noise Pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.02] z-50" style={{ backgroundImage: `url('data:image/svg+xml,%3Csvg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"%3E%3Cfilter id="noiseFilter"%3E%3CfeTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/%3E%3C/filter%3E%3Crect width="100%25" height="100%25" filter="url(%23noiseFilter)"/%3E%3C/svg%3E')` }}></div>
      {currentUser ? (
        <ChatLayout currentUser={currentUser} onLogout={handleLogout} />
      ) : (
        <Auth onLogin={handleLogin} />
      )}
    </div>
  );
}
