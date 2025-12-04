'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState('');

  const createRoom = () => {
    // Generate a short ID
    const id = Math.random().toString(36).substring(2, 8).toUpperCase();
    // Mark this user as host for this room
    if (typeof window !== 'undefined') {
      localStorage.setItem(`host_${id}`, 'true');
    }
    router.push(`/room/${id}`);
  };

  const joinRoom = () => {
    if (!roomId.trim()) return;
    router.push(`/room/${roomId.toUpperCase()}`);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-8">🎵 Phòng Nghe Nhạc Chung</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        {/* Create Room */}
        <div className="bg-gray-800 p-8 rounded-xl shadow-lg flex flex-col items-center">
          <h2 className="text-2xl font-semibold mb-4">Tạo Phòng Mới</h2>
          <p className="text-gray-400 mb-6 text-center">Tạo một phòng nghe nhạc và mời bạn bè vào cùng nghe.</p>
          <button
            onClick={createRoom}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-full transition duration-300"
          >
            Tạo Phòng Ngay
          </button>
        </div>

        {/* Join Room */}
        <div className="bg-gray-800 p-8 rounded-xl shadow-lg flex flex-col items-center">
          <h2 className="text-2xl font-semibold mb-4">Vào Phòng</h2>
          <p className="text-gray-400 mb-6 text-center">Nhập mã phòng từ bạn bè để tham gia.</p>
          <div className="flex w-full">
            <input
              type="text"
              placeholder="Nhập mã phòng..."
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="flex-1 p-3 rounded-l-lg bg-gray-700 border-none text-white focus:ring-2 focus:ring-green-500 outline-none"
            />
            <button
              onClick={joinRoom}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-r-lg transition duration-300"
            >
              Vào
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
