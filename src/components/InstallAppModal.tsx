import React, { useState, useEffect } from "react";
import { X, Smartphone, Monitor, ChevronRight, Apple, Share, PlusSquare, ArrowDownToLine } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InstallAppModal({ isOpen, onClose }: InstallAppModalProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isNativeAvailable, setIsNativeAvailable] = useState(false);
  const [activeTab, setActiveTab] = useState<'ios' | 'android' | 'desktop'>('desktop');

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsNativeAvailable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Detect platform for defaults
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setActiveTab('ios');
    } else if (/android/.test(ua)) {
      setActiveTab('android');
    } else {
      setActiveTab('desktop');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      setDeferredPrompt(null);
      setIsNativeAvailable(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-[#15191C] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="p-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 bg-teal-500/10 rounded-xl flex items-center justify-center text-teal-400 border border-teal-500/20">
              <ArrowDownToLine className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Download & Install App</h3>
              <p className="text-xs text-gray-400">Add 5CharChat to your device home screen</p>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4">
          {/* Quick Install Prompt (if browser supports it natively) */}
          {isNativeAvailable ? (
            <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-2xl text-center space-y-3">
              <p className="text-sm text-gray-200">
                Your browser supports one-click automatic installation!
              </p>
              <button
                onClick={handleInstallClick}
                className="w-full py-2.5 bg-gradient-to-tr from-teal-500 to-emerald-400 hover:opacity-90 text-black font-bold rounded-xl shadow-lg shadow-teal-500/15 transition-all cursor-pointer"
              >
                Install App Now
              </button>
            </div>
          ) : (
            <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-center text-xs text-gray-400">
              ⚡ Safe sandbox installation. Follow the quick steps below based on your device.
            </div>
          )}

          {/* Platform tabs */}
          <div className="flex bg-[#0B0E11] p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setActiveTab('desktop')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === 'desktop' ? "bg-[#1C2227] text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              <Monitor className="h-3.5 w-3.5" />
              <span>Desktop</span>
            </button>
            <button
              onClick={() => setActiveTab('ios')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === 'ios' ? "bg-[#1C2227] text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              <Apple className="h-3.5 w-3.5" />
              <span>iOS / Safari</span>
            </button>
            <button
              onClick={() => setActiveTab('android')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === 'android' ? "bg-[#1C2227] text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Android</span>
            </button>
          </div>

          {/* Instructions Container */}
          <div className="bg-[#0B0E11] p-4 rounded-2xl border border-white/5 min-h-[160px] flex flex-col justify-center">
            {activeTab === 'ios' && (
              <div className="space-y-3.5">
                <div className="flex gap-3 items-start">
                  <span className="flex h-5 w-5 rounded-full bg-teal-500/10 text-teal-400 items-center justify-center text-xs font-bold shrink-0 mt-0.5 border border-teal-500/25">1</span>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Open <span className="text-white font-semibold">Safari Browser</span> on your iPhone or iPad.
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="flex h-5 w-5 rounded-full bg-teal-500/10 text-teal-400 items-center justify-center text-xs font-bold shrink-0 mt-0.5 border border-teal-500/25">2</span>
                  <p className="text-xs text-gray-300 leading-relaxed flex items-center gap-1.5 flex-wrap">
                    Tap the <span className="text-white font-semibold flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded border border-white/10"><Share className="h-3.5 w-3.5" /> Share</span> button in the bottom menu bar.
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="flex h-5 w-5 rounded-full bg-teal-500/10 text-teal-400 items-center justify-center text-xs font-bold shrink-0 mt-0.5 border border-teal-500/25">3</span>
                  <p className="text-xs text-gray-300 leading-relaxed flex items-center gap-1.5 flex-wrap">
                    Scroll down and select <span className="text-white font-semibold flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded border border-white/10"><PlusSquare className="h-3.5 w-3.5" /> Add to Home Screen</span>.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'android' && (
              <div className="space-y-3.5">
                <div className="flex gap-3 items-start">
                  <span className="flex h-5 w-5 rounded-full bg-teal-500/10 text-teal-400 items-center justify-center text-xs font-bold shrink-0 mt-0.5 border border-teal-500/25">1</span>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Tap the <span className="text-white font-semibold">Three Dots Menu</span> in the top-right corner of Chrome.
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="flex h-5 w-5 rounded-full bg-teal-500/10 text-teal-400 items-center justify-center text-xs font-bold shrink-0 mt-0.5 border border-teal-500/25">2</span>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Select <span className="text-white font-semibold">"Install app"</span> or <span className="text-white font-semibold">"Add to Home screen"</span> from the list.
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="flex h-5 w-5 rounded-full bg-teal-500/10 text-teal-400 items-center justify-center text-xs font-bold shrink-0 mt-0.5 border border-teal-500/25">3</span>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Follow the prompt to add the application directly to your home launcher.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'desktop' && (
              <div className="space-y-3.5">
                <div className="flex gap-3 items-start">
                  <span className="flex h-5 w-5 rounded-full bg-teal-500/10 text-teal-400 items-center justify-center text-xs font-bold shrink-0 mt-0.5 border border-teal-500/25">1</span>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Look for the <span className="text-teal-400 font-semibold">"Install / Monitor" icon</span> on the right side of your browser's URL address bar.
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="flex h-5 w-5 rounded-full bg-teal-500/10 text-teal-400 items-center justify-center text-xs font-bold shrink-0 mt-0.5 border border-teal-500/25">2</span>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Click on it to trigger the immediate desktop software wrapper prompt.
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="flex h-5 w-5 rounded-full bg-teal-500/10 text-teal-400 items-center justify-center text-xs font-bold shrink-0 mt-0.5 border border-teal-500/25">3</span>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Confirm the dialog to run 5CharChat in a dedicated window environment!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#0B0E11] flex items-center justify-center gap-1 text-[10px] text-gray-500 border-t border-white/5">
          <span>✓ Works on Android, iOS, Windows, macOS & Linux</span>
        </div>
      </motion.div>
    </div>
  );
}
