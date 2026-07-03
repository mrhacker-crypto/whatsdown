import React, { useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { User } from "../types";
import { MessageSquareCode, UserPlus, LogIn, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "motion/react";

interface AuthProps {
  onLogin: (user: User) => void;
}

// Generate a clean 5-character alphanumeric code
// Exclude similar looking characters like O/0, I/1, L
const ALLOWED_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCode(): string {
  let result = "";
  for (let i = 0; i < 5; i++) {
    result += ALLOWED_CHARS.charAt(Math.floor(Math.random() * ALLOWED_CHARS.length));
  }
  return result;
}

export default function Auth({ onLogin }: AuthProps) {
  const [activeTab, setActiveTab] = useState<"register" | "login">("register");
  const [displayName, setDisplayName] = useState("");
  const [userCode, setUserCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError("Please enter a name.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let uniqueCode = "";
      let codeExists = true;
      let attempts = 0;

      // Find a unique 5-character code
      while (codeExists && attempts < 10) {
        uniqueCode = generateCode();
        const userDocRef = doc(db, "users", uniqueCode);
        const docSnap = await getDoc(userDocRef);
        if (!docSnap.exists()) {
          codeExists = false;
        }
        attempts++;
      }

      if (codeExists) {
        throw new Error("Unable to generate a unique code. Please try again.");
      }

      const userData: User = {
        code: uniqueCode,
        name: displayName.trim(),
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        isOnline: true,
        typingInChat: null,
      };

      // Create user doc
      await setDoc(doc(db, "users", uniqueCode), userData);

      // Save in localStorage
      localStorage.setItem("chat_user_code", uniqueCode);
      onLogin({
        ...userData,
        // Since serverTimestamp is handled server side, mock it as local Date for now
        createdAt: new Date(),
        lastSeen: new Date(),
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during registration. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = userCode.trim().toUpperCase();
    if (cleanCode.length !== 5) {
      setError("Code must be exactly 5 characters.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userDocRef = doc(db, "users", cleanCode);
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as User;
        // Save in localStorage
        localStorage.setItem("chat_user_code", cleanCode);
        onLogin(data);
      } else {
        setError("This 5-character code was not found. Please double check or join as a new user.");
      }
    } catch (err: any) {
      console.error(err);
      setError("An error occurred during connection. Please check your network and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E11] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        {/* Logo Icon */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-black shadow-xl shadow-teal-500/20 mb-6"
        >
          <MessageSquareCode className="h-10 w-10 text-slate-950" />
        </motion.div>

        <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans">
          5-Character Chat
        </h2>
        <p className="mt-2 text-sm text-gray-400 font-sans px-4">
          The next-gen secure messaging experience. Just a simple 5-character code. No phone numbers, no hassle.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0 z-10">
        <div className="bg-[#15191C] py-8 px-6 shadow-2xl rounded-2xl border border-white/10 sm:px-10">
          {/* Tab Selection */}
          <div className="flex bg-[#0B0E11] p-1.5 rounded-xl mb-6 border border-white/5">
            <button
              onClick={() => {
                setActiveTab("register");
                setError(null);
              }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${
                activeTab === "register"
                  ? "bg-[#1F2429] text-white shadow-sm border border-white/5"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Join Now
            </button>
            <button
              onClick={() => {
                setActiveTab("login");
                setError(null);
              }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${
                activeTab === "login"
                  ? "bg-[#1F2429] text-white shadow-sm border border-white/5"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <LogIn className="h-4 w-4" />
              Have a Code
            </button>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-rose-950/20 border border-rose-500/20 rounded-xl text-rose-300 text-sm"
            >
              {error}
            </motion.div>
          )}

          {activeTab === "register" ? (
            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-300">
                  Choose a Display Name
                </label>
                <div className="mt-1.5 relative">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Liam, Sophia"
                    className="appearance-none block w-full px-4 py-3 bg-[#1B2024] border border-white/10 rounded-xl shadow-inner placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 text-white text-sm"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <Sparkles className="h-4 w-4 text-teal-400" />
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-black bg-gradient-to-tr from-teal-500 to-emerald-400 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Creating Profile..." : "Generate Code & Join"}
                  <ArrowRight className="h-4 w-4 text-slate-950" />
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label htmlFor="code" className="block text-sm font-semibold text-gray-300">
                  Enter your 5-Character Code
                </label>
                <div className="mt-1.5 relative">
                  <input
                    id="code"
                    name="code"
                    type="text"
                    required
                    maxLength={5}
                    value={userCode}
                    onChange={(e) => setUserCode(e.target.value.toUpperCase())}
                    placeholder="e.g. X9F3K"
                    className="appearance-none block w-full px-4 py-3 bg-[#1B2024] border border-white/10 rounded-xl shadow-inner placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 text-white font-mono tracking-widest text-center text-lg uppercase"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500 text-center">
                  Use your unique 5-letter code to sign back into your chats.
                </p>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-black bg-gradient-to-tr from-teal-500 to-emerald-400 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Connecting..." : "Connect"}
                  <ArrowRight className="h-4 w-4 text-slate-950" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
