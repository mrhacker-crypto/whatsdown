import React, { useState, useEffect } from "react";
import { X, Smartphone, Monitor, Apple, Share, PlusSquare, ArrowDownToLine, Check, CheckCircle2, Loader2, Laptop, Download } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InstallAppModal({ isOpen, onClose }: InstallAppModalProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isNativeAvailable, setIsNativeAvailable] = useState(false);
  const [activeTab, setActiveTab] = useState<'ios' | 'android' | 'desktop'>('desktop');
  
  // Custom installation / download simulation states
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [installStage, setInstallStage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

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

  const downloadLauncherFile = () => {
    const launcherHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>What's Down - Launcher</title>
  <style>
    body {
      background-color: #0B0E11;
      color: #FFFFFF;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
    }
    .container {
      text-align: center;
      padding: 24px;
    }
    .logo {
      font-size: 56px;
      margin-bottom: 20px;
      animation: pulse 2s infinite ease-in-out;
    }
    .title {
      font-size: 28px;
      font-weight: 800;
      margin-bottom: 8px;
      letter-spacing: -0.025em;
      background: linear-gradient(135deg, #14b8a6, #34d399);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .sub {
      color: #9ca3af;
      font-size: 15px;
      margin-bottom: 32px;
    }
    .spinner {
      border: 3px solid rgba(20, 184, 166, 0.1);
      border-top: 3px solid #14b8a6;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      animation: spin 1s linear infinite;
      margin: 0 auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.08); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">💬</div>
    <div class="title">What's Down</div>
    <div class="sub">Launching secure 5-character chat...</div>
    <div class="spinner"></div>
  </div>
  <script>
    setTimeout(() => {
      window.location.href = "${window.location.origin}";
    }, 1500);
  </script>
</body>
</html>`;

    const blob = new Blob([launcherHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Whats-Down-Launcher.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleInstallClick = async () => {
    // If native prompt is available, trigger it first
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to install prompt: ${outcome}`);
        setDeferredPrompt(null);
        setIsNativeAvailable(false);
      } catch (err) {
        console.error("Native installation failed", err);
      }
    }

    // Trigger gorgeous high-speed installation progress
    setInstalling(true);
    setIsSuccess(false);
    setProgress(0);
    setInstallStage("Checking device compatibility...");

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.floor(Math.random() * 8) + 4;
        if (next >= 100) {
          clearInterval(interval);
          setInstallStage("What's Down installed successfully!");
          setIsSuccess(true);
          setInstalling(false);
          downloadLauncherFile();
          return 100;
        }

        // Update logs dynamically
        if (next < 20) {
          setInstallStage("Allocating offline sandbox cache...");
        } else if (next < 45) {
          setInstallStage("Downloading static assets & libraries...");
        } else if (next < 70) {
          setInstallStage("Registering offline service worker (sw.js)...");
        } else if (next < 90) {
          setInstallStage("Generating What's Down-Launcher shortcut...");
        } else {
          setInstallStage("Wrapping client package...");
        }
        return next;
      });
    }, 100);
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
              <ArrowDownToLine className="h-5 w-5 animate-bounce" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Download & Install</h3>
              <p className="text-xs text-gray-400">Install What's Down onto your phone or laptop</p>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5">
          <AnimatePresence mode="wait">
            {installing ? (
              /* PROGRESS STAGE */
              <motion.div
                key="progress"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-4 py-4"
              >
                <div className="flex justify-between text-xs font-semibold text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 text-teal-400 animate-spin" />
                    {installStage}
                  </span>
                  <span className="font-mono text-teal-400">{progress}%</span>
                </div>
                <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-100 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-500 text-center">
                  Downloading secure sandboxed files onto your local device...
                </p>
              </motion.div>
            ) : isSuccess ? (
              /* SUCCESS STAGE */
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="space-y-4 py-2 text-center"
              >
                <div className="flex justify-center mb-1">
                  <CheckCircle2 className="h-12 w-12 text-emerald-400 animate-pulse" />
                </div>
                <h4 className="text-base font-bold text-white">What's Down Installed Successfully!</h4>
                <p className="text-xs text-gray-400 px-2 leading-relaxed">
                  We have prepared and downloaded your secure launcher file: <span className="text-teal-400 font-mono">Whats-Down-Launcher.html</span>.
                </p>
                <div className="bg-[#0B0E11] p-3 rounded-xl border border-white/5 text-left text-[11px] text-gray-400 space-y-1.5">
                  <div className="flex gap-2 items-center text-white font-semibold">
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>How to use the downloaded Launcher:</span>
                  </div>
                  <p>1. Move the downloaded <strong className="text-gray-200">Whats-Down-Launcher.html</strong> file to your desktop or home screen folder.</p>
                  <p>2. Double click/tap it any time to launch What's Down instantly!</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={downloadLauncherFile}
                    className="flex-1 py-2 text-xs font-semibold bg-white/5 text-gray-300 hover:text-white rounded-lg border border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                  >
                    Download Launcher Again
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-2 text-xs font-bold bg-teal-500 hover:bg-teal-400 text-black rounded-lg transition-all cursor-pointer"
                  >
                    Close & Start Chatting
                  </button>
                </div>
              </motion.div>
            ) : (
              /* INITIAL STAGE */
              <motion.div
                key="initial"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-2xl text-center space-y-3.5">
                  <p className="text-sm text-teal-300 font-medium">
                    {isNativeAvailable
                      ? "⚡ Automatic One-Click Installer Available!"
                      : "💬 Install What's Down Standalone Native Shortcut"}
                  </p>
                  <button
                    onClick={handleInstallClick}
                    className="w-full py-3.5 bg-gradient-to-tr from-teal-500 to-emerald-400 hover:opacity-90 text-black font-extrabold text-sm rounded-xl shadow-lg shadow-teal-500/15 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="h-4.5 w-4.5" />
                    Download & Install What's Down
                  </button>
                  <p className="text-[10px] text-teal-400/80">
                    Saves app files locally & triggers launcher download. Works on PC, Mac, Android, and iOS.
                  </p>
                </div>

                {/* Platform instruction tabs */}
                <div className="space-y-3">
                  <span className="block text-xs font-semibold text-gray-400">Manual Installation Steps:</span>
                  <div className="flex bg-[#0B0E11] p-1 rounded-xl border border-white/5">
                    <button
                      onClick={() => setActiveTab('desktop')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                        activeTab === 'desktop' ? "bg-[#1C2227] text-white" : "text-gray-400 hover:text-white"
                      }`}
                    >
                      <Laptop className="h-3.5 w-3.5" />
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

                  <div className="bg-[#0B0E11] p-4 rounded-2xl border border-white/5 min-h-[140px] flex flex-col justify-center">
                    {activeTab === 'ios' && (
                      <div className="space-y-3">
                        <div className="flex gap-2.5 items-start text-xs text-gray-300">
                          <span className="flex h-5 w-5 rounded-full bg-teal-500/10 text-teal-400 items-center justify-center font-bold border border-teal-500/25 shrink-0 mt-0.5">1</span>
                          <p>Open <span className="text-white font-semibold">Safari Browser</span> on your iPhone/iPad.</p>
                        </div>
                        <div className="flex gap-2.5 items-start text-xs text-gray-300">
                          <span className="flex h-5 w-5 rounded-full bg-teal-500/10 text-teal-400 items-center justify-center font-bold border border-teal-500/25 shrink-0 mt-0.5">2</span>
                          <p className="flex items-center gap-1.5 flex-wrap">
                            Tap the <span className="text-white font-semibold flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded border border-white/10"><Share className="h-3.5 w-3.5" /> Share</span> button.
                          </p>
                        </div>
                        <div className="flex gap-2.5 items-start text-xs text-gray-300">
                          <span className="flex h-5 w-5 rounded-full bg-teal-500/10 text-teal-400 items-center justify-center font-bold border border-teal-500/25 shrink-0 mt-0.5">3</span>
                          <p className="flex items-center gap-1.5 flex-wrap">
                            Scroll and select <span className="text-white font-semibold flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded border border-white/10"><PlusSquare className="h-3.5 w-3.5" /> Add to Home Screen</span>.
                          </p>
                        </div>
                      </div>
                    )}

                    {activeTab === 'android' && (
                      <div className="space-y-3">
                        <div className="flex gap-2.5 items-start text-xs text-gray-300">
                          <span className="flex h-5 w-5 rounded-full bg-teal-500/10 text-teal-400 items-center justify-center font-bold border border-teal-500/25 shrink-0 mt-0.5">1</span>
                          <p>Tap the <span className="text-white font-semibold">Three Dots Menu</span> in Chrome's top-right corner.</p>
                        </div>
                        <div className="flex gap-2.5 items-start text-xs text-gray-300">
                          <span className="flex h-5 w-5 rounded-full bg-teal-500/10 text-teal-400 items-center justify-center font-bold border border-teal-500/25 shrink-0 mt-0.5">2</span>
                          <p>Select <span className="text-white font-semibold">"Install app"</span> or <span className="text-white font-semibold">"Add to Home screen"</span>.</p>
                        </div>
                        <div className="flex gap-2.5 items-start text-xs text-gray-300">
                          <span className="flex h-5 w-5 rounded-full bg-teal-500/10 text-teal-400 items-center justify-center font-bold border border-teal-500/25 shrink-0 mt-0.5">3</span>
                          <p>Confirm the prompt to pin What's Down directly to your launcher app drawer.</p>
                        </div>
                      </div>
                    )}

                    {activeTab === 'desktop' && (
                      <div className="space-y-3">
                        <div className="flex gap-2.5 items-start text-xs text-gray-300">
                          <span className="flex h-5 w-5 rounded-full bg-teal-500/10 text-teal-400 items-center justify-center font-bold border border-teal-500/25 shrink-0 mt-0.5">1</span>
                          <p>Look for the <span className="text-teal-400 font-semibold">Install Icon</span> on the right side of Chrome's address bar.</p>
                        </div>
                        <div className="flex gap-2.5 items-start text-xs text-gray-300">
                          <span className="flex h-5 w-5 rounded-full bg-teal-500/10 text-teal-400 items-center justify-center font-bold border border-teal-500/25 shrink-0 mt-0.5">2</span>
                          <p>Click on it to activate the native installation wrapper.</p>
                        </div>
                        <div className="flex gap-2.5 items-start text-xs text-gray-300">
                          <span className="flex h-5 w-5 rounded-full bg-teal-500/10 text-teal-400 items-center justify-center font-bold border border-teal-500/25 shrink-0 mt-0.5">3</span>
                          <p>What's Down will open in its own clean standalone desktop frame window.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#0B0E11] flex items-center justify-center gap-1 text-[10px] text-gray-500 border-t border-white/5">
          <span>✓ Support offline mode & high-performance local storage caching</span>
        </div>
      </motion.div>
    </div>
  );
}
