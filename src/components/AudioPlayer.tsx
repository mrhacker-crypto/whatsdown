import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

interface AudioPlayerProps {
  audioUrl: string;
  duration?: number | null;
  isMe?: boolean;
}

export default function AudioPlayer({ audioUrl, duration, isMe }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };

    audio.addEventListener("ended", onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("ended", onEnded);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioUrl]);

  const updateProgress = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (isPlaying) {
        animationRef.current = requestAnimationFrame(updateProgress);
      }
    }
  };

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(updateProgress);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  }, [isPlaying]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(err => console.error("Audio playback error", err));
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const displayDuration = duration || (audioRef.current ? audioRef.current.duration : 0) || 0;

  // Generate unique dummy visual wave bars for design
  const totalBars = 16;
  const bars = Array.from({ length: totalBars }, (_, i) => {
    // Generate static wave heights
    const h = 20 + Math.sin(i * 0.8) * 15 + Math.cos(i * 0.4) * 8;
    return Math.max(10, Math.min(35, h));
  });

  return (
    <div className={`flex items-center gap-3 py-1.5 px-3 rounded-xl border ${
      isMe 
        ? "bg-teal-700/50 border-teal-500/30 text-white" 
        : "bg-[#1E252B] border-white/5 text-gray-200"
    } w-64 max-w-full shadow-inner select-none mt-1`}>
      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-all ${
          isMe 
            ? "bg-white text-teal-800 hover:scale-105" 
            : "bg-teal-500 text-black hover:scale-105 shadow-md shadow-teal-500/20"
        }`}
      >
        {isPlaying ? (
          <Pause className="h-4.5 w-4.5 fill-current" />
        ) : (
          <Play className="h-4.5 w-4.5 fill-current ml-0.5" />
        )}
      </button>

      {/* Progress & Waveform */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        {/* Visual Wave */}
        <div className="flex items-end gap-0.5 h-6 px-1 overflow-hidden opacity-80 mb-1">
          {bars.map((barHeight, idx) => {
            const barProgress = (idx / totalBars) * displayDuration;
            const isPlayed = currentTime >= barProgress;
            return (
              <span
                key={idx}
                style={{ height: `${barHeight}px` }}
                className={`flex-1 rounded-sm transition-colors duration-200 ${
                  isPlayed 
                    ? isMe ? "bg-white" : "bg-teal-400"
                    : isMe ? "bg-teal-600" : "bg-gray-600"
                }`}
              />
            );
          })}
        </div>

        {/* Scrub Slider */}
        <input
          type="range"
          min={0}
          max={displayDuration || 100}
          value={currentTime}
          onChange={handleSliderChange}
          className={`w-full h-1 rounded-lg appearance-none cursor-pointer focus:outline-none accent-teal-400 bg-black/20`}
        />

        {/* Time Trackers */}
        <div className="flex justify-between items-center mt-1 text-[10px] text-gray-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(displayDuration)}</span>
        </div>
      </div>

      {/* Mute Button */}
      <button
        onClick={toggleMute}
        className={`p-1.5 rounded-lg hover:bg-white/5 cursor-pointer text-gray-400 hover:text-white shrink-0`}
      >
        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
