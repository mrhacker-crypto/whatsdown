import React, { useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { User } from "../types";
import { Search, X, Check, ArrowRight, AlertCircle, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface NewChatModalProps {
  currentUserCode: string;
  onClose: () => void;
  onSelectConversation: (conversationId: string, partner: User) => void;
}

export default function NewChatModal({
  currentUserCode,
  onClose,
  onSelectConversation,
}: NewChatModalProps) {
  const [code, setCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchedUser, setSearchedUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();

    if (cleanCode.length !== 5) {
      setError("Please enter a valid 5-character code.");
      return;
    }

    if (cleanCode === currentUserCode) {
      setError("You cannot search for your own code!");
      return;
    }

    setSearching(true);
    setError(null);
    setSearchedUser(null);

    try {
      const userRef = doc(db, "users", cleanCode);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        setSearchedUser(userSnap.data() as User);
      } else {
        setError(`No user found with code "${cleanCode}". Please verify the code and try again.`);
      }
    } catch (err) {
      console.error(err);
      setError("Error finding user. Please check your connection.");
    } finally {
      setSearching(false);
    }
  };

  const handleStartChat = async () => {
    if (!searchedUser) return;

    try {
      const codes = [currentUserCode, searchedUser.code].sort();
      const conversationId = `${codes[0]}_${codes[1]}`;

      const convRef = doc(db, "conversations", conversationId);
      const convSnap = await getDoc(convRef);

      if (!convSnap.exists()) {
        // Create new conversation
        await setDoc(convRef, {
          id: conversationId,
          participants: codes,
          updatedAt: serverTimestamp(),
          unreadCounts: {
            [codes[0]]: 0,
            [codes[1]]: 0,
          },
          lastMessage: null,
        });
      }

      onSelectConversation(conversationId, searchedUser);
      onClose();
    } catch (err) {
      console.error(err);
      setError("Error starting chat. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0E11]/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-[#15191C] rounded-2xl shadow-2xl max-w-md w-full border border-white/10 overflow-hidden"
      >
        <div className="px-6 py-4 bg-[#1B2024] border-b border-white/5 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-teal-400" />
            <h3 className="font-semibold text-lg">Start a New Chat</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white rounded-full p-1 hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-400 text-sm mb-4 leading-relaxed">
            Ask your friend for their unique 5-character chat code (e.g. <b className="text-teal-400 font-mono">A3F9K</b>) and type it below to connect.
          </p>

          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Friend's Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={5}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setError(null);
                    setSearchedUser(null);
                  }}
                  placeholder="X9T2K"
                  className="flex-1 px-4 py-3 bg-[#1B2024] border border-white/10 rounded-xl shadow-inner text-center text-lg font-mono tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 text-white"
                />
                <button
                  type="submit"
                  disabled={searching || code.trim().length !== 5}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-5 rounded-xl flex items-center justify-center font-medium shadow-lg shadow-teal-600/10 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {searching ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Search className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </form>

          <div className="mt-6 min-h-[100px] flex items-center justify-center">
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-2 items-start p-4 bg-rose-950/20 border border-rose-500/20 rounded-xl text-rose-300 text-sm w-full"
              >
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
                <span>{error}</span>
              </motion.div>
            )}

            {!error && !searchedUser && !searching && (
              <p className="text-gray-600 text-sm text-center italic">
                Enter a code and click search.
              </p>
            )}

            {searchedUser && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full p-4 border border-white/10 bg-[#1B2024] rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 text-black font-bold flex items-center justify-center">
                    {searchedUser.name[0].toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">{searchedUser.name}</h4>
                    <span className="text-xs font-mono text-teal-400 bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.5 rounded uppercase">
                      Code: {searchedUser.code}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleStartChat}
                  className="bg-gradient-to-tr from-teal-500 to-emerald-400 text-black px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 hover:opacity-90 transition-all cursor-pointer shadow-lg shadow-teal-500/10"
                >
                  Add & Chat
                  <ArrowRight className="h-4 w-4 text-slate-950" />
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
