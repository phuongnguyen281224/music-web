'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

export default function PomodoroTimer() {
  // 25 minutes in seconds
  const WORK_TIME = 25 * 60;
  // 5 minutes in seconds
  const BREAK_TIME = 5 * 60;

  const [timeLeft, setTimeLeft] = useState(WORK_TIME);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      // Timer finished
      setIsActive(false);
      if (timerRef.current) clearInterval(timerRef.current);
      // Play a sound or notification here if needed
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(mode === 'work' ? WORK_TIME : BREAK_TIME);
  };

  const switchMode = (newMode: 'work' | 'break') => {
    setMode(newMode);
    setIsActive(false);
    setTimeLeft(newMode === 'work' ? WORK_TIME : BREAK_TIME);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl">
      <div className="flex gap-2 mb-6 bg-black/20 p-1 rounded-xl">
        <button
          onClick={() => switchMode('work')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'work'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          Làm việc
        </button>
        <button
          onClick={() => switchMode('break')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'break'
              ? 'bg-green-600 text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-white/10'
          }`}
        >
          Nghỉ ngơi
        </button>
      </div>

      <div className="text-8xl font-mono font-bold text-white mb-8 tracking-wider drop-shadow-lg">
        {formatTime(timeLeft)}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleTimer}
          className="w-16 h-16 flex items-center justify-center rounded-full bg-white text-black hover:bg-gray-200 transition-all active:scale-95 shadow-lg"
        >
          {isActive ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
        </button>
        <button
          onClick={resetTimer}
          className="w-16 h-16 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all active:scale-95 border border-white/10"
        >
          <RotateCcw size={28} />
        </button>
      </div>
    </div>
  );
}
