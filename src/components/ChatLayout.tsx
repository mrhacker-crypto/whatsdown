import React, { useState, useEffect } from "react";
import { User } from "../types";
import ChatSidebar from "./ChatSidebar";
import ChatWindow from "./ChatWindow";
import NewChatModal from "./NewChatModal";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

interface ChatLayoutProps {
  currentUser: User;
  onLogout: () => void;
}

export default function ChatLayout({ currentUser, onLogout }: ChatLayoutProps) {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activePartner, setActivePartner] = useState<User | null>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  // Mark user as online on mount and handle tab close/visibility changes
  useEffect(() => {
    if (!currentUser.code) return;

    const setUserStatus = async (isOnline: boolean) => {
      try {
        const userRef = doc(db, "users", currentUser.code);
        await updateDoc(userRef, {
          isOnline: isOnline,
          lastSeen: serverTimestamp(),
        });
      } catch (err) {
        console.error("Error updating user status:", err);
      }
    };

    // Set online
    setUserStatus(true);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setUserStatus(true);
      } else {
        setUserStatus(false);
      }
    };

    // Handle offline event
    const handleOffline = () => setUserStatus(false);
    const handleOnline = () => setUserStatus(true);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", () => setUserStatus(false));
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      setUserStatus(false);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", () => setUserStatus(false));
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [currentUser.code]);

  const handleSelectConversation = (conversationId: string, partner: User) => {
    setActiveConversationId(conversationId);
    setActivePartner(partner);
  };

  const handleLogoutClick = async () => {
    try {
      // Mark as offline in Firestore
      const userRef = doc(db, "users", currentUser.code);
      await updateDoc(userRef, {
        isOnline: false,
        lastSeen: serverTimestamp(),
        typingInChat: null,
      });
    } catch (err) {
      console.error("Error marking offline before logout:", err);
    }
    // Perform standard logout
    onLogout();
  };

  return (
    <div className="h-screen w-screen flex bg-[#0B0E11] overflow-hidden relative font-sans">
      {/* Sidebar - Visible on mobile if no conversation is active, or always on desktop */}
      <div
        className={`${
          activeConversationId ? "hidden md:flex" : "flex w-full"
        } h-full`}
      >
        <ChatSidebar
          currentUser={currentUser}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onOpenNewChat={() => setShowNewChatModal(true)}
          onLogout={handleLogoutClick}
        />
      </div>

      {/* Active Chat Window - Visible on mobile if a conversation is active, or always on desktop */}
      <div
        className={`${
          activeConversationId ? "flex flex-1" : "hidden md:flex md:flex-1"
        } h-full`}
      >
        <ChatWindow
          currentUser={currentUser}
          conversationId={activeConversationId}
          partner={activePartner}
          onBack={() => {
            setActiveConversationId(null);
            setActivePartner(null);
          }}
        />
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <NewChatModal
          currentUserCode={currentUser.code}
          onClose={() => setShowNewChatModal(false)}
          onSelectConversation={handleSelectConversation}
        />
      )}
    </div>
  );
}
