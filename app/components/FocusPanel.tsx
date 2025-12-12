'use client';

import { X } from 'lucide-react';
import PomodoroTimer from './PomodoroTimer';

interface FocusPanelProps {
  onClose: () => void;
}

export default function FocusPanel({ onClose }: FocusPanelProps) {
  return (
    <div className="absolute inset-0 z-50 overflow-hidden flex items-center justify-center bg-gray-950/95 backdrop-blur-sm transition-opacity duration-300">

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 animate-fade-in-up">
        <PomodoroTimer />

        <button
            onClick={onClose}
            className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all border border-white/10 shadow-lg font-medium group"
        >
            <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            Thoát chế độ tập trung
        </button>
      </div>

      <style jsx>{`
        @keyframes fade-in-up {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
            animation: fade-in-up 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
