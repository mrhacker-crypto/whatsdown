import React, { useState, useEffect, useRef } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
  writeBatch,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import { User, Message, Conversation } from "../types";
import Avatar from "./Avatar";
import {
  Send,
  Image as ImageIcon,
  Check,
  CheckCheck,
  Smile,
  ShieldCheck,
  Paperclip,
  PhoneCall,
  Video,
  X,
  ArrowLeft,
  Mic,
  Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import AudioPlayer from "./AudioPlayer";
import CallScreen from "./CallScreen";

interface ChatWindowProps {
  currentUser: User;
  conversationId: string | null;
  partner: User | null;
  onBack?: () => void;
}

// Preset mock image attachments to send for premium UX!
const PRESET_ATTACHMENTS = [
  { name: "Sunset", url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=60" },
  { name: "Workspace", url: "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=600&auto=format&fit=crop&q=60" },
  { name: "Coffee", url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=60" },
  { name: "Cat", url: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=60" },
];

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

export default function ChatWindow({
  currentUser,
  conversationId,
  partner,
  onBack,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Calling & Voice Recording states
  const [activeCall, setActiveCall] = useState<Conversation["activeCall"] | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Subscribe to messages in active conversation
  useEffect(() => {
    if (!conversationId) return;

    const q = query(
      collection(db, "conversations", conversationId, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgList: Message[] = [];
      snapshot.forEach((doc) => {
        msgList.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(msgList);
    });

    return () => unsubscribe();
  }, [conversationId]);

  // Subscribe to conversation for call states
  useEffect(() => {
    if (!conversationId) {
      setActiveCall(null);
      return;
    }

    const docRef = doc(db, "conversations", conversationId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setActiveCall(data.activeCall || null);
      } else {
        setActiveCall(null);
      }
    });

    return () => unsubscribe();
  }, [conversationId]);

  // Clean up recording timers on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  // 2. Mark incoming messages as read & Reset unread counts
  useEffect(() => {
    if (!conversationId || !partner) return;

    // Reset current user's unread counts in the conversation
    const markAsRead = async () => {
      try {
        const convRef = doc(db, "conversations", conversationId);
        await updateDoc(convRef, {
          [`unreadCounts.${currentUser.code}`]: 0,
        });

        // Also update individual message read statuses if they are from partner and not read
        const msgsRef = collection(db, "conversations", conversationId, "messages");
        const unreadSnapshot = await getDocs(msgsRef);

        const batch = writeBatch(db);
        let updatedCount = 0;

        unreadSnapshot.forEach((docSnap) => {
          const msg = docSnap.data();
          if (msg.senderId === partner.code && !msg.read) {
            batch.update(docSnap.ref, { read: true });
            updatedCount++;
          }
        });

        if (updatedCount > 0) {
          await batch.commit();
        }
      } catch (err) {
        console.error("Error marking messages as read:", err);
      }
    };

    markAsRead();
  }, [conversationId, messages.length, partner, currentUser.code]);

  // 3. Scroll to bottom smoothly on new message or chat change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, partner]);

  // 4. Typing Status Manager
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    if (!conversationId) return;

    // Set typing state to Firestore
    if (!isTyping) {
      setIsTyping(true);
      updateUserTypingState(conversationId);
    }

    // Reset typing status after 2 seconds of inactivity
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      updateUserTypingState(null);
    }, 2000);
  };

  const updateUserTypingState = async (chatId: string | null) => {
    try {
      const userRef = doc(db, "users", currentUser.code);
      await updateDoc(userRef, {
        typingInChat: chatId,
      });
    } catch (err) {
      console.error("Error setting typing status", err);
    }
  };

  // Clean typing state on unmount or chat change
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (currentUser?.code) {
        updateUserTypingState(null);
      }
    };
  }, [conversationId]);

  // 5. Send Message Handler
  const handleSendMessage = async (e: React.FormEvent, imageUrl: string | null = null) => {
    e.preventDefault();
    if (!inputText.trim() && !imageUrl) return;
    if (!conversationId || !partner) return;

    const messageText = imageUrl ? "[Photo Attachment]" : inputText.trim();
    setInputText("");
    setIsTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    updateUserTypingState(null);

    try {
      // Add message to subcollection
      const messagesRef = collection(db, "conversations", conversationId, "messages");
      const messageData = {
        senderId: currentUser.code,
        receiverId: partner.code,
        text: imageUrl ? "" : messageText,
        timestamp: serverTimestamp(),
        read: false,
        imageUrl: imageUrl,
      };

      await addDoc(messagesRef, messageData);

      // Update conversation's last message, updatedAt, and increment unread count for partner
      const convRef = doc(db, "conversations", conversationId);
      
      // We get the current unread count to increment it
      // Instead of reading, we can use an increment or set it to 1 if we don't know, but to be safe and clean,
      // let's increment it using standard object structures or increment operator!
      // In firestore, we can use increment:
      // import { increment } from "firebase/firestore";
      // To keep imports simple, let's just do update with incremental or manual
      const { increment } = await import("firebase/firestore");

      await updateDoc(convRef, {
        lastMessage: {
          text: imageUrl ? "📷 Photo" : messageText,
          senderId: currentUser.code,
          timestamp: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
        [`unreadCounts.${partner.code}`]: increment(1),
      });

    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  // Send Voice Message Attachment
  const handleSendAudioMessage = async (audioBase64: string, duration: number) => {
    if (!conversationId || !partner) return;

    try {
      const messagesRef = collection(db, "conversations", conversationId, "messages");
      const messageData = {
        senderId: currentUser.code,
        receiverId: partner.code,
        text: "",
        timestamp: serverTimestamp(),
        read: false,
        audioUrl: audioBase64,
        audioDuration: duration,
      };

      await addDoc(messagesRef, messageData);

      const convRef = doc(db, "conversations", conversationId);
      const { increment } = await import("firebase/firestore");

      await updateDoc(convRef, {
        lastMessage: {
          text: "🎵 Voice Message",
          senderId: currentUser.code,
          timestamp: serverTimestamp(),
          isAudio: true,
        },
        updatedAt: serverTimestamp(),
        [`unreadCounts.${partner.code}`]: increment(1),
      });

    } catch (err) {
      console.error("Error sending voice note:", err);
    }
  };

  // Voice message recorder control functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach(track => track.stop());

        if (recordingTime < 1) {
          console.log("Recording too short");
          return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          await handleSendAudioMessage(base64Audio, recordingTime);
        };
      };

      setRecordingTime(0);
      setIsRecording(true);
      mediaRecorder.start();

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Microphone access is required to capture and record audio.");
    }
  };

  const cancelRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = () => {
        if (mediaRecorderRef.current?.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
      };
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingTime(0);
  };

  const stopAndSendRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // real-time P2P voice/video call triggers
  const handleInitiateCall = async (type: "audio" | "video") => {
    if (!conversationId) return;
    try {
      const convRef = doc(db, "conversations", conversationId);
      await updateDoc(convRef, {
        activeCall: {
          callerId: currentUser.code,
          status: "ringing",
          type,
          timestamp: serverTimestamp()
        }
      });
    } catch (err) {
      console.error("Error starting call:", err);
    }
  };

  const handleAcceptCall = async () => {
    if (!conversationId) return;
    try {
      const convRef = doc(db, "conversations", conversationId);
      await updateDoc(convRef, {
        "activeCall.status": "connected"
      });
    } catch (err) {
      console.error("Error accepting call:", err);
    }
  };

  const handleHangUpCall = async () => {
    if (!conversationId) return;
    try {
      const convRef = doc(db, "conversations", conversationId);
      await updateDoc(convRef, {
        activeCall: null
      });
    } catch (err) {
      console.error("Error hanging up call:", err);
    }
  };

  // 6. Format time of message
  const formatMsgTime = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // 7. Render Split Screens
  if (!conversationId || !partner) {
    return (
      <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-[#0B0E11] p-8 text-center h-full relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-md flex flex-col items-center z-10"
        >
          <div className="h-20 w-20 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-teal-500/5 animate-pulse">
            <ShieldCheck className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Connect by 5-Character Code</h2>
          <p className="text-sm text-gray-400 mb-6 leading-relaxed">
            Welcome to the secure 5-character chat space. Share your unique code with others, or enter theirs to start chatting in real-time.
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#15191C] border border-white/5 rounded-full text-xs text-gray-400 font-medium tracking-wide">
            🔒 Fully encrypted database channels
          </div>
        </motion.div>
      </div>
    );
  }

  const isPartnerTyping = partner.typingInChat === conversationId;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B0E11] relative overflow-hidden">
      {/* Active Partner Header */}
      <div className="p-4 bg-[#1B2024] border-b border-white/5 flex items-center justify-between shadow-lg z-10">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden p-1.5 -ml-1 text-gray-400 hover:text-teal-400 hover:bg-white/5 rounded-full transition-colors cursor-pointer"
              title="Back to chat list"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <Avatar
            name={partner.name}
            code={partner.code}
            isOnline={partner.isOnline}
            showStatus={true}
          />
          <div className="min-w-0">
            <h3 className="font-semibold text-white text-sm truncate">
              {partner.name}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-teal-400 bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                {partner.code}
              </span>
              <span className="text-xs text-gray-400 font-medium">
                {isPartnerTyping ? (
                  <span className="text-teal-400 font-medium animate-pulse">typing...</span>
                ) : partner.isOnline ? (
                  <span className="text-emerald-400 font-medium">Online</span>
                ) : (
                  `Offline • Last seen ${formatLastSeen(partner.lastSeen)}`
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Video / Call Mock Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleInitiateCall("audio")}
            title="Start Audio Call"
            className="p-2 text-gray-400 hover:text-teal-400 hover:bg-white/5 rounded-full transition-colors cursor-pointer"
          >
            <PhoneCall className="h-5 w-5" />
          </button>
          <button
            onClick={() => handleInitiateCall("video")}
            title="Start Video Call"
            className="p-2 text-gray-400 hover:text-teal-400 hover:bg-white/5 rounded-full transition-colors cursor-pointer"
          >
            <Video className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
      >
        {messages.length === 0 ? (
          <div className="text-center my-8">
            <div className="inline-block bg-[#15191C] text-gray-400 text-xs py-2.5 px-4 rounded-xl border border-white/10 shadow-xl shadow-black/20 max-w-xs">
              👋 Start the conversation! Send a message or beautiful attachment below.
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser.code;
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-md relative group ${
                    isMe
                      ? "bg-teal-600 text-white rounded-br-none shadow-lg shadow-teal-600/10"
                      : "bg-[#15191C] text-gray-100 rounded-bl-none border border-white/10"
                  }`}
                >
                  {/* Photo attachment display */}
                  {msg.imageUrl && (
                    <div className="mb-2 rounded-lg overflow-hidden border border-white/5 bg-[#0B0E11]">
                      <img
                        src={msg.imageUrl}
                        alt="Shared media"
                        referrerPolicy="no-referrer"
                        className="w-full h-auto max-h-60 object-cover"
                      />
                    </div>
                  )}

                  {msg.text && <p className="text-sm leading-relaxed break-words">{msg.text}</p>}

                  {/* Audio message play display */}
                  {msg.audioUrl && (
                    <AudioPlayer
                      audioUrl={msg.audioUrl}
                      duration={msg.audioDuration}
                      isMe={isMe}
                    />
                  )}

                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] select-none text-right justify-items-end float-right ml-2">
                    <span className={isMe ? "text-teal-200/80" : "text-gray-500"}>
                      {formatMsgTime(msg.timestamp)}
                    </span>
                    {isMe && (
                      <span className="shrink-0">
                        {msg.read ? (
                          <CheckCheck className="h-3.5 w-3.5 text-sky-200" />
                        ) : (
                          <Check className="h-3.5 w-3.5 text-teal-200" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Menu Popover */}
      {showAttachmentMenu && (
        <div className="absolute bottom-20 left-4 z-20 bg-[#15191C] rounded-2xl shadow-2xl border border-white/10 p-4 w-72">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/5">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Send Preset Photo
            </span>
            <button
              onClick={() => setShowAttachmentMenu(false)}
              className="text-gray-400 hover:text-white rounded-full cursor-pointer p-0.5 hover:bg-white/5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {PRESET_ATTACHMENTS.map((attachment) => (
              <button
                key={attachment.name}
                onClick={(e) => {
                  handleSendMessage(e, attachment.url);
                  setShowAttachmentMenu(false);
                }}
                className="group relative h-20 rounded-xl overflow-hidden border border-white/5 focus:outline-none cursor-pointer hover:border-teal-500/50 transition-colors"
              >
                <img
                  src={attachment.url}
                  alt={attachment.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <span className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-semibold">
                  {attachment.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message Input Box */}
      <div className="p-4 bg-[#1B2024] border-t border-white/5">
        {isRecording ? (
          <div className="flex items-center justify-between gap-4 py-2 px-3 bg-[#15191C] rounded-2xl border border-red-500/10 animate-pulse">
            {/* Blinking recording indicator and timer */}
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 bg-red-500 rounded-full animate-ping shrink-0" />
              <span className="text-xs font-semibold text-red-400">Recording Audio</span>
              <span className="text-sm font-mono text-gray-200 bg-white/5 px-2 py-0.5 rounded-lg">
                {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, "0")}
              </span>
            </div>

            {/* Cancel and Send controls */}
            <div className="flex items-center gap-2">
              {/* Trash/Cancel */}
              <button
                type="button"
                onClick={cancelRecording}
                title="Discard Recording"
                className="p-2.5 bg-white/5 hover:bg-red-500/15 text-gray-400 hover:text-red-400 rounded-xl transition-all cursor-pointer"
              >
                <Trash2 className="h-5 w-5" />
              </button>

              {/* Stop & Send Voice Note */}
              <button
                type="button"
                onClick={stopAndSendRecording}
                title="Send Voice Note"
                className="py-2.5 px-4 bg-gradient-to-tr from-teal-500 to-emerald-400 hover:opacity-90 text-black font-bold rounded-xl shadow-lg shadow-teal-500/15 transition-all text-xs cursor-pointer"
              >
                Send Voice Message
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
              title="Attach preset image"
              className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                showAttachmentMenu
                  ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                  : "text-gray-400 hover:text-teal-400 hover:bg-white/5"
              }`}
            >
              <Paperclip className="h-5 w-5" />
            </button>

            <input
              type="text"
              placeholder="Type a message..."
              value={inputText}
              onChange={handleInputChange}
              className="flex-1 px-4 py-3 bg-[#15191C] border border-white/5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:bg-[#1B2024] transition-all text-white placeholder-gray-500"
            />

            {inputText.trim() ? (
              <button
                type="submit"
                className="p-3 bg-gradient-to-tr from-teal-500 to-emerald-400 hover:opacity-90 text-black font-bold rounded-xl shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center cursor-pointer"
              >
                <Send className="h-4 w-4 text-slate-950" />
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                title="Record Voice Note"
                className="p-3 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold rounded-xl shadow-lg shadow-teal-500/15 transition-all flex items-center justify-center cursor-pointer"
              >
                <Mic className="h-4 w-4 text-slate-950" />
              </button>
            )}
          </form>
        )}
      </div>

      {activeCall && (
        <CallScreen
          currentUser={currentUser}
          partner={partner}
          activeCall={activeCall}
          onHangUp={handleHangUpCall}
          onAccept={handleAcceptCall}
        />
      )}
    </div>
  );
}
