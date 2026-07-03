import React, { useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { User } from "../types";
import { UserPlus, LogIn, ArrowRight, Sparkles, Lock, User as UserIcon, Copy, Check } from "lucide-react";
import { motion } from "motion/react";
import WhatsDownLogo from "./WhatsDownLogo";

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
  const [password, setPassword] = useState("");
  
  const [userCode, setUserCode] = useState("");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredUser, setRegisteredUser] = useState<User | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError("Please choose a username.");
      return;
    }
    if (!password.trim()) {
      setError("Please enter a password.");
      return;
    }
    if (password.length < 4) {
      setError("Password must be at least 4 characters.");
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
        password: password.trim(),
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        isOnline: true,
        typingInChat: null,
      };

      // Create user doc
      await setDoc(doc(db, "users", uniqueCode), userData);

      // Save in localStorage
      localStorage.setItem("chat_user_code", uniqueCode);
      
      setRegisteredUser({
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
    if (!loginUsername.trim()) {
      setError("Please enter your username.");
      return;
    }
    if (!loginPassword.trim()) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const userDocRef = doc(db, "users", cleanCode);
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as User;
        
        // Verify credentials
        const matchesUsername = data.name.trim().toLowerCase() === loginUsername.trim().toLowerCase();
        // Support legacy accounts that might not have a password
        const matchesPassword = !data.password || data.password === loginPassword.trim();

        if (matchesUsername && matchesPassword) {
          // Save in localStorage
          localStorage.setItem("chat_user_code", cleanCode);
          onLogin(data);
        } else if (!matchesUsername) {
          setError("Username does not match the 5-character code.");
        } else {
          setError("Incorrect password. Please try again.");
        }
      } else {
        setError("This 5-character code was not found. Please double check or register as a new user.");
      }
    } catch (err: any) {
      console.error(err);
      setError("An error occurred during connection. Please check your network and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (registeredUser) {
    return (
      <div className="min-h-screen bg-[#0B0E11] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 px-4 animate-fade-in">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-black shadow-xl shadow-teal-500/20 mb-6"
          >
            <Sparkles className="h-10 w-10 text-slate-950" />
          </motion.div>
          
          <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans">
            Profile Created Successfully!
          </h2>
          <p className="mt-2 text-sm text-gray-400 font-sans">
            Save your login details securely. You will need all three to log in next time!
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0 z-10">
          <div className="bg-[#15191C] py-8 px-6 shadow-2xl rounded-2xl border border-white/10 sm:px-10 space-y-6">
            <div className="bg-[#0B0E11] p-5 rounded-xl border border-white/5 space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <div>
                  <span className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Username</span>
                  <span className="text-white font-semibold text-base">{registeredUser.name}</span>
                </div>
                <UserIcon className="h-5 w-5 text-gray-500" />
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <span className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Password</span>
                  <span className="text-white font-mono text-base">{registeredUser.password}</span>
                </div>
                <Lock className="h-5 w-5 text-gray-500" />
              </div>
            </div>

            <div className="bg-teal-950/20 border border-teal-500/20 p-5 rounded-xl text-center space-y-3">
              <span className="block text-[10px] font-bold text-teal-400 uppercase tracking-widest">Your Unique 5-Character Code</span>
              <div className="flex items-center justify-center gap-4">
                <span className="text-4xl font-black font-mono tracking-widest text-teal-300 select-all uppercase">
                  {registeredUser.code}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(registeredUser.code);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="p-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 transition-colors border border-teal-500/20 cursor-pointer"
                  title="Copy Code"
                >
                  {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-teal-400/80">
                Write this down. It cannot be recovered if lost!
              </p>
            </div>

            <button
              onClick={() => onLogin(registeredUser)}
              className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-black bg-gradient-to-tr from-teal-500 to-emerald-400 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all cursor-pointer"
            >
              Enter Lobby
              <ArrowRight className="h-4.5 w-4.5 text-slate-950" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E11] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        {/* Logo Icon */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
          className="mx-auto flex justify-center mb-6"
        >
          <WhatsDownLogo size="lg" />
        </motion.div>

        <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans">
          What's Down
        </h2>
        <p className="mt-2 text-sm text-gray-400 font-sans px-4">
          The next-gen secure messaging experience. Register a profile and get your unique 5-character access key for What's Down.
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
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === "register"
                  ? "bg-[#1F2429] text-white shadow-sm border border-white/5"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Register
            </button>
            <button
              onClick={() => {
                setActiveTab("login");
                setError(null);
              }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === "login"
                  ? "bg-[#1F2429] text-white shadow-sm border border-white/5"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <LogIn className="h-4 w-4" />
              Log In
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
                  Choose a Username
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
                    className="appearance-none block w-full pl-11 pr-4 py-3 bg-[#1B2024] border border-white/10 rounded-xl shadow-inner placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 text-white text-sm"
                  />
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-gray-500" />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="register-password" className="block text-sm font-semibold text-gray-300">
                  Choose a Password
                </label>
                <div className="mt-1.5 relative">
                  <input
                    id="register-password"
                    name="register-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 4 characters"
                    className="appearance-none block w-full pl-11 pr-4 py-3 bg-[#1B2024] border border-white/10 rounded-xl shadow-inner placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 text-white text-sm"
                  />
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-500" />
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-black bg-gradient-to-tr from-teal-500 to-emerald-400 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Creating Profile..." : "Register & Generate Code"}
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
              </div>

              <div>
                <label htmlFor="login-username" className="block text-sm font-semibold text-gray-300">
                  Username
                </label>
                <div className="mt-1.5 relative">
                  <input
                    id="login-username"
                    name="login-username"
                    type="text"
                    required
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="Enter your registered username"
                    className="appearance-none block w-full pl-11 pr-4 py-3 bg-[#1B2024] border border-white/10 rounded-xl shadow-inner placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 text-white text-sm"
                  />
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-gray-500" />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-sm font-semibold text-gray-300">
                  Password
                </label>
                <div className="mt-1.5 relative">
                  <input
                    id="login-password"
                    name="login-password"
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="appearance-none block w-full pl-11 pr-4 py-3 bg-[#1B2024] border border-white/10 rounded-xl shadow-inner placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 text-white text-sm"
                  />
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-500" />
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-black bg-gradient-to-tr from-teal-500 to-emerald-400 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Authenticating..." : "Connect"}
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
