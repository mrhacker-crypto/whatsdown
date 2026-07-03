import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import { User, Conversation } from "../types";
import Avatar from "./Avatar";
import {
  MessageSquarePlus,
  LogOut,
  Search,
  Copy,
  Check,
  MessageCircle,
  ArrowDownToLine,
} from "lucide-react";
import InstallAppModal from "./InstallAppModal";

interface ChatSidebarProps {
  currentUser: User;
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string, partner: User) => void;
  onOpenNewChat: () => void;
  onLogout: () => void;
}

export default function ChatSidebar({
  currentUser,
  activeConversationId,
  onSelectConversation,
  onOpenNewChat,
  onLogout,
}: ChatSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [partners, setPartners] = useState<{ [code: string]: User }>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  // Copy 5-character code to clipboard
  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentUser.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. Subscribe to conversations
  useEffect(() => {
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", currentUser.code)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const convList: Conversation[] = [];
        snapshot.forEach((doc) => {
          convList.push(doc.data() as Conversation);
        });

        // Sort in-memory to avoid index requirements
        const sortedConvs = convList.sort((a, b) => {
          const tA = a.updatedAt?.seconds || 0;
          const tB = b.updatedAt?.seconds || 0;
          return tB - tA;
        });

        setConversations(sortedConvs);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching conversations:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser.code]);

  // 2. Subscribe to partners' profiles in active conversations
  useEffect(() => {
    if (conversations.length === 0) return;

    const unsubscribes: (() => void)[] = [];

    conversations.forEach((conv) => {
      const partnerCode = conv.participants.find(
        (code) => code !== currentUser.code
      );
      if (!partnerCode) return;

      // Listen to partner user document
      const partnerRef = doc(db, "users", partnerCode);
      const unsub = onSnapshot(
        partnerRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const partnerData = docSnap.data() as User;
            setPartners((prev) => ({
              ...prev,
              [partnerCode]: partnerData,
            }));
          }
        },
        (err) => console.error("Error listening to partner", partnerCode, err)
      );
      unsubscribes.push(unsub);
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [conversations, currentUser.code]);

  // Format timestamp nicely
  const formatTime = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();

    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  // Format last seen timestamp nicely
  const formatLastSeen = (timestamp: any) => {
    if (!timestamp) return "Never";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    if (diffMs < 60000) {
      return "Just now";
    }

    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    }

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) {
      return "Yesterday";
    }
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }

    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  // Filter conversations based on search
  const filteredConversations = conversations.filter((conv) => {
    const partnerCode = conv.participants.find(
      (code) => code !== currentUser.code
    );
    if (!partnerCode) return false;
    const partner = partners[partnerCode];
    if (!partner) return true; // Show while loading partner data

    const matchesName = partner.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCode = partner.code
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesName || matchesCode;
  });

  return (
    <div className="w-full md:w-96 border-r border-white/10 bg-[#15191C] flex flex-col h-full shrink-0">
      {/* Profile Header */}
      <div className="p-4 bg-[#1B2024] border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar name={currentUser.name} code={currentUser.code} isOnline={true} showStatus={true} />
          <div className="overflow-hidden">
            <h3 className="font-semibold text-white text-sm truncate">
              {currentUser.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs font-mono font-medium text-teal-400 bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.5 rounded tracking-wide select-all uppercase">
                {currentUser.code}
              </span>
              <button
                onClick={handleCopyCode}
                title="Copy my code"
                className="text-gray-400 hover:text-white rounded p-0.5 transition-colors cursor-pointer"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsInstallModalOpen(true)}
            title="Download / Install App"
            className="p-2 text-gray-400 hover:text-teal-400 hover:bg-white/5 rounded-full transition-colors cursor-pointer"
          >
            <ArrowDownToLine className="h-5 w-5" />
          </button>
          <button
            onClick={onOpenNewChat}
            title="Start New Chat"
            className="p-2 text-gray-400 hover:text-teal-400 hover:bg-white/5 rounded-full transition-colors cursor-pointer"
          >
            <MessageSquarePlus className="h-5 w-5" />
          </button>
          <button
            onClick={onLogout}
            title="Logout"
            className="p-2 text-gray-400 hover:text-rose-400 hover:bg-white/5 rounded-full transition-colors cursor-pointer"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-white/5 bg-[#15191C]">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-500" />
          <input
            type="text"
            placeholder="Search codes or names..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#1B2024] border border-white/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:bg-[#1F2429] transition-all text-gray-200 placeholder-gray-500"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/5 bg-[#15191C]">
        {loading ? (
          <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center h-full">
            <span className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">Loading conversations...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-gray-500 h-full flex flex-col items-center justify-center px-6">
            <MessageCircle className="h-12 w-12 text-gray-700 mb-3 animate-pulse" />
            <p className="text-sm font-medium text-gray-300 mb-1">No secure channels</p>
            <p className="text-xs max-w-[200px] mx-auto text-gray-500 mb-4 leading-relaxed">
              Click the plus icon to hook up with a partner using their 5-character code.
            </p>
            <button
              onClick={onOpenNewChat}
              className="px-4 py-2 bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/20 text-xs font-semibold rounded-lg tracking-wider transition-colors cursor-pointer"
            >
              Uplink Partner
            </button>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const partnerCode = conv.participants.find(
              (code) => code !== currentUser.code
            );
            if (!partnerCode) return null;

            const partner = partners[partnerCode] || {
              code: partnerCode,
              name: "Loading...",
              isOnline: false,
              typingInChat: null,
            };

            const isSelected = activeConversationId === conv.id;
            const isTyping = partner.typingInChat === conv.id;
            const unreadCount = conv.unreadCounts?.[currentUser.code] || 0;

            return (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id, partner as User)}
                className={`w-full p-4 flex items-start gap-3 transition-colors text-left ${
                  isSelected
                    ? "bg-white/5 border-l-2 border-teal-500"
                    : "hover:bg-white/5 bg-transparent"
                }`}
              >
                <Avatar
                  name={partner.name}
                  code={partner.code}
                  isOnline={partner.isOnline}
                  showStatus={true}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h4 className="font-semibold text-white text-sm truncate">
                        {partner.name}
                      </h4>
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${
                          partner.isOnline ? "bg-emerald-400 animate-pulse" : "bg-gray-600"
                        }`}
                        title={partner.isOnline ? "Online" : `Last seen: ${formatLastSeen((partner as any).lastSeen)}`}
                      />
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {formatTime(conv.updatedAt || conv.lastMessage?.timestamp)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    {isTyping ? (
                      <span className="text-xs text-teal-400 font-medium animate-pulse">
                        typing...
                      </span>
                    ) : (
                      <p className="text-xs text-gray-400 truncate pr-2 flex-1">
                        {conv.lastMessage
                          ? (conv.lastMessage.senderId === currentUser.code ? "You: " : "") +
                            conv.lastMessage.text
                          : "No secure messages yet"}
                      </p>
                    )}

                    {unreadCount > 0 && (
                      <span className="bg-teal-500 text-black text-[10px] font-bold h-5 min-w-5 px-1.5 rounded-full flex items-center justify-center shrink-0">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] text-teal-400/50 font-mono tracking-wider uppercase">
                      {partner.code}
                    </p>
                    <span className="text-[10px] text-gray-500">
                      {partner.isOnline ? (
                        <span className="text-teal-400/80 font-medium">Active now</span>
                      ) : (
                        `Seen ${formatLastSeen((partner as any).lastSeen)}`
                      )}
                    </span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />
    </div>
  );
}
