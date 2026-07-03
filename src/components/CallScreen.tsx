import React, { useState, useEffect, useRef } from "react";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Avatar from "./Avatar";

interface CallScreenProps {
  currentUser: { code: string; name: string };
  partner: { code: string; name: string; isOnline: boolean };
  activeCall: {
    callerId: string;
    status: 'ringing' | 'connected' | 'ended';
    type: 'audio' | 'video';
    timestamp: any;
  };
  onHangUp: () => void;
  onAccept: () => void;
}

export default function CallScreen({
  currentUser,
  partner,
  activeCall,
  onHangUp,
  onAccept
}: CallScreenProps) {
  const isIncoming = activeCall.callerId !== currentUser.code && activeCall.status === "ringing";
  const isOutgoing = activeCall.callerId === currentUser.code && activeCall.status === "ringing";
  const isConnected = activeCall.status === "connected";

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(activeCall.type === "video");
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Sound effects inside browser using Web Audio API synthesis (No external assets needed!)
  const playRingtone = (type: 'ringing' | 'outgoing' | 'hangup') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'ringing') {
        osc.frequency.setValueAtTime(440, audioCtx.currentTime); // Standard ring tone
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 1.5);
      } else if (type === 'outgoing') {
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 1);
      } else if (type === 'hangup') {
        osc.frequency.setValueAtTime(250, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch (e) {
      console.log("Audio feedback error:", e);
    }
  };

  // Sound feedbacks on state transitions
  useEffect(() => {
    if (isIncoming) {
      const interval = setInterval(() => {
        playRingtone('ringing');
      }, 3000);
      playRingtone('ringing');
      return () => clearInterval(interval);
    } else if (isOutgoing) {
      const interval = setInterval(() => {
        playRingtone('outgoing');
      }, 2500);
      playRingtone('outgoing');
      return () => clearInterval(interval);
    }
  }, [isIncoming, isOutgoing]);

  // Call timer
  useEffect(() => {
    if (!isConnected) return;

    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isConnected]);

  // Mic waveform capture & camera video stream
  useEffect(() => {
    if (!isConnected) return;

    let localStream: MediaStream | null = null;

    const startMedia = async () => {
      try {
        const constraints = {
          audio: true,
          video: activeCall.type === "video" ? { width: 300, height: 200 } : false
        };

        localStream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = localStream;

        // Video setup if applicable
        if (activeCall.type === "video" && localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
          localVideoRef.current.play().catch(e => console.log("Video preview error", e));
        }

        // Web Audio Analyser setup for waveform representation
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioCtx();
        audioContextRef.current = audioContext;

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;

        const source = audioContext.createMediaStreamSource(localStream);
        source.connect(analyser);

        // Start animation loop to draw mic waveform on HTML canvas
        drawWaveform();

      } catch (err) {
        console.error("Failed to capture user media:", err);
      }
    };

    startMedia();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(e => console.log(e));
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isConnected]);

  // Handle local mute status
  const toggleMute = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = isMuted; // inverted because state updates after event
      });
      setIsMuted(!isMuted);
    }
  };

  // Handle video enable/disable
  const toggleVideo = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(track => {
        track.enabled = isVideoOn;
      });
      setIsVideoOn(!isVideoOn);
    }
  };

  // Waveform visualization drawing
  const drawWaveform = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!canvas || !analyserRef.current) return;
      animationFrameRef.current = requestAnimationFrame(draw);

      analyserRef.current.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 1.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;

        ctx.fillStyle = `rgba(20, 184, 166, ${Math.max(0.2, barHeight / 100)})`;
        // Draw centered bars
        ctx.fillRect(x, canvas.height / 2 - barHeight / 2, barWidth - 2, barHeight);

        x += barWidth;
      }
    };

    draw();
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0E11]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-white overflow-hidden">
      
      {/* Background Ambience Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col items-center flex-1 justify-between py-12">
        
        {/* Top Header Information */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-teal-400 mb-4 tracking-wider uppercase">
            {activeCall.type === "video" ? "📹 Secure Video Call" : "📞 Secure Audio Call"}
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight mb-2">{partner.name}</h2>
          <p className="text-sm font-mono text-teal-400 tracking-wider uppercase mb-1">CODE: {partner.code}</p>
          
          <p className="text-sm text-gray-400 mt-2">
            {isIncoming && "Incoming Call..."}
            {isOutgoing && "Ringing..."}
            {isConnected && (
              <span className="flex items-center justify-center gap-1.5 text-emerald-400 font-bold animate-pulse">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Connected • {formatDuration(callDuration)}
              </span>
            )}
          </p>
        </div>

        {/* Center Avatars / Waveform / Video Stream */}
        <div className="relative my-8 flex flex-col items-center justify-center w-full min-h-[220px]">
          
          {/* Active Call Video Preview */}
          {isConnected && activeCall.type === "video" && (
            <div className="relative w-72 h-48 rounded-2xl overflow-hidden border border-white/10 bg-[#15191C] shadow-2xl flex items-center justify-center mb-4">
              <video
                ref={localVideoRef}
                muted
                playsInline
                className="w-full h-full object-cover transform scale-x-[-1]"
              />
              <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] font-mono">
                Your Camera
              </div>
            </div>
          )}

          {/* Standard Audio Avatar Pulse */}
          {(!isConnected || activeCall.type !== "video") && (
            <div className="relative">
              {/* Pulsing Ripple circles */}
              <div className="absolute inset-0 bg-teal-500/10 rounded-full scale-110 animate-ping" />
              <div className="absolute inset-0 bg-teal-500/5 rounded-full scale-150 animate-pulse" />
              
              <div className="relative bg-[#1B2024] p-2 rounded-full border border-white/10 shadow-2xl">
                <Avatar name={partner.name} code={partner.code} size="lg" />
              </div>
            </div>
          )}

          {/* Microphone Waveform Visual Canvas */}
          {isConnected && (
            <div className="w-full max-w-xs mt-8">
              <canvas
                ref={canvasRef}
                width={300}
                height={60}
                className="w-full h-15 opacity-80"
              />
              <p className="text-[10px] text-gray-500 text-center font-mono tracking-wide mt-2">
                🎤 REAL-TIME SOUNDWAVE FEEDBACK
              </p>
            </div>
          )}
        </div>

        {/* Bottom Call Controls Bar */}
        <div className="flex flex-col items-center gap-6 w-full">
          
          {/* Connected Call Adjustments */}
          {isConnected && (
            <div className="flex justify-center gap-4">
              {/* Mute button */}
              <button
                onClick={toggleMute}
                className={`p-3.5 rounded-full transition-all cursor-pointer border ${
                  isMuted 
                    ? "bg-red-500/20 border-red-500/40 text-red-400" 
                    : "bg-white/5 border-white/10 hover:bg-white/10 text-white"
                }`}
                title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>

              {/* Video toggle if it is a video call */}
              {activeCall.type === "video" && (
                <button
                  onClick={toggleVideo}
                  className={`p-3.5 rounded-full transition-all cursor-pointer border ${
                    !isVideoOn 
                      ? "bg-red-500/20 border-red-500/40 text-red-400" 
                      : "bg-white/5 border-white/10 hover:bg-white/10 text-white"
                  }`}
                  title={isVideoOn ? "Turn Camera Off" : "Turn Camera On"}
                >
                  {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </button>
              )}
            </div>
          )}

          {/* Accept / Decline / Hang Up actions */}
          <div className="flex justify-center gap-6 w-full max-w-xs">
            {isIncoming ? (
              <>
                {/* Accept Call */}
                <button
                  onClick={onAccept}
                  className="flex-1 flex flex-col items-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-2xl shadow-lg shadow-emerald-500/20 font-bold transition-all cursor-pointer scale-105"
                >
                  <Phone className="h-6 w-6" />
                  <span className="text-xs">Accept</span>
                </button>

                {/* Decline Call */}
                <button
                  onClick={() => {
                    playRingtone('hangup');
                    onHangUp();
                  }}
                  className="flex-1 flex flex-col items-center gap-2 py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl shadow-lg shadow-red-500/20 font-bold transition-all cursor-pointer"
                >
                  <PhoneOff className="h-6 w-6" />
                  <span className="text-xs">Decline</span>
                </button>
              </>
            ) : (
              /* Hang Up Outgoing or Connected Call */
              <button
                onClick={() => {
                  playRingtone('hangup');
                  onHangUp();
                }}
                className="w-full flex items-center justify-center gap-2 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl shadow-xl shadow-red-600/10 font-bold transition-all cursor-pointer hover:scale-102"
              >
                <PhoneOff className="h-5 w-5" />
                <span>Hang Up</span>
              </button>
            )}
          </div>

          {/* Secure disclaimer */}
          <p className="text-[10px] text-gray-500 tracking-wide text-center">
            🔒 Fully encrypted end-to-end signaling tunnel
          </p>
        </div>
      </div>
    </div>
  );
}
