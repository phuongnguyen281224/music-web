'use client';

import { X } from 'lucide-react';
import PomodoroTimer from './PomodoroTimer';

interface FocusPanelProps {
  onClose: () => void;
}

export default function FocusPanel({ onClose }: FocusPanelProps) {
  return (
    <div className="absolute inset-0 z-50 overflow-hidden flex items-center justify-center">
      {/* CSS Animated Background - Wind blowing on green steppe */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-blue-300 via-blue-200 to-green-300 overflow-hidden">

        {/* Sky Gradient */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#87CEEB_0%,#E0F6FF_50%,#F0FFF0_100%)]"></div>

        {/* Clouds */}
        <div className="absolute top-[10%] left-0 w-full h-[200px] opacity-80 animate-float-slow pointer-events-none">
            <div className="absolute top-0 left-[10%] w-32 h-12 bg-white rounded-full blur-xl opacity-60"></div>
            <div className="absolute top-10 left-[40%] w-48 h-16 bg-white rounded-full blur-xl opacity-70"></div>
            <div className="absolute top-5 left-[70%] w-40 h-14 bg-white rounded-full blur-xl opacity-50"></div>
        </div>

        {/* Animated Grass/Hills - Using multiple layers for depth */}

        {/* Far Hills */}
        <div className="absolute bottom-[20%] left-0 w-[120%] h-[30%] bg-[#8FBC8F] rounded-[50%] blur-[2px] translate-x-[-10%]"></div>

        {/* Mid Hills */}
        <div className="absolute bottom-[10%] right-[-10%] w-[120%] h-[35%] bg-[#3CB371] rounded-[60%] blur-[1px]"></div>

        {/* Foreground Grass Layer (CSS Pattern) */}
        <div className="absolute bottom-0 w-full h-[40%] bg-gradient-to-t from-[#228B22] to-[#32CD32]">
            {/* Wind Effect Overlay */}
            <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/grass.png')] animate-pulse-slow"></div>
        </div>

        {/* Wind Particles (Simulated) */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
             {/* We can use a simple repeated gradient animation for "wind" lines */}
             <div className="absolute top-[60%] left-0 w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_40px,rgba(255,255,255,0.1)_40px,rgba(255,255,255,0.1)_80px)] animate-wind"></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 animate-fade-in-up">
        <PomodoroTimer />

        <button
            onClick={onClose}
            className="flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-full backdrop-blur-md transition-all border border-white/20 shadow-lg font-medium group"
        >
            <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            Thoát chế độ tập trung
        </button>
      </div>

      {/* CSS Styles injection for specific animations if not in global css */}
      <style jsx>{`
        @keyframes float-slow {
            0% { transform: translateX(0); }
            50% { transform: translateX(20px); }
            100% { transform: translateX(0); }
        }
        @keyframes wind {
            0% { background-position: 0 0; }
            100% { background-position: 100px 0; }
        }
        @keyframes fade-in-up {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
        }
        .animate-float-slow {
            animation: float-slow 10s ease-in-out infinite;
        }
        .animate-wind {
            animation: wind 3s linear infinite;
        }
        .animate-fade-in-up {
            animation: fade-in-up 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
