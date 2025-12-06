'use client';

import { useState, useEffect, useRef } from 'react';
import { roomService } from '@/lib/services/roomService';
import { onValue } from 'firebase/database';
import { Send, MessageCircle, Edit2, Settings, Image as ImageIcon, Palette, Trash2, X } from 'lucide-react';

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

interface ChatPanelProps {
  roomId: string;
  username: string; // Passed from parent
  onChangeName: () => void; // Request parent to change name
}

export default function ChatPanel({ roomId, username, onChangeName }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Customization State
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [userColor, setUserColor] = useState('#2563eb'); // Default blue-600
  const [showSettings, setShowSettings] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
        const savedBg = localStorage.getItem('chat_bg_image');
        const savedColor = localStorage.getItem('chat_user_color');
        if (savedBg) setBgImage(savedBg);
        if (savedColor) setUserColor(savedColor);
    }
  }, []);

  // Subscribe to messages
  useEffect(() => {
    if (!roomId) return;

    const messagesRef = roomService.getMessagesRef(roomId);
    if (!messagesRef) return;

    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messageList = Object.entries(data).map(([key, value]: [string, any]) => ({
          id: key,
          ...value,
        }));
        setMessages(messageList);
      } else {
        setMessages([]);
      }
    });

    return () => unsubscribe();
  }, [roomId]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !username) return;

    roomService.sendMessage(roomId, username, newMessage.trim());
    setNewMessage('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setBgImage(result);
        localStorage.setItem('chat_bg_image', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setBgImage(null);
    localStorage.removeItem('chat_bg_image');
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setUserColor(color);
    localStorage.setItem('chat_user_color', color);
  };

  const resetColor = () => {
    setUserColor('#2563eb');
    localStorage.removeItem('chat_user_color');
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-gray-900">
      {/* Background Layer */}
      {bgImage && (
        <>
          <div
            className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-500"
            style={{
              backgroundImage: `url(${bgImage})`,
              filter: 'blur(8px)',
              transform: 'scale(1.1)', // Prevent blurred edges
            }}
          />
          {/* Dark Overlay for Readability */}
          <div className="absolute inset-0 z-0 bg-black/40" />
        </>
      )}

      {/* Settings Modal/Panel */}
      {showSettings && (
        <div className="absolute top-16 right-4 z-30 w-72 bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl p-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-700">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Settings size={18} /> Cài đặt giao diện
            </h3>
            <button
              onClick={() => setShowSettings(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Background Settings */}
          <div className="mb-4">
            <label className="text-xs text-gray-400 font-medium mb-2 flex items-center gap-1.5">
              <ImageIcon size={14} /> Ảnh nền chat
            </label>
            <div className="flex gap-2">
              <label className="flex-1 cursor-pointer bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs py-2 px-3 rounded-lg transition-colors text-center truncate flex items-center justify-center gap-2">
                <span>{bgImage ? 'Thay đổi ảnh' : 'Tải ảnh lên'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
              {bgImage && (
                <button
                  onClick={handleRemoveImage}
                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                  title="Xóa ảnh nền"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Color Settings */}
          <div>
            <label className="text-xs text-gray-400 font-medium mb-2 flex items-center gap-1.5">
              <Palette size={14} /> Màu tin nhắn của bạn
            </label>
            <div className="flex items-center gap-3 bg-gray-700/50 p-2 rounded-lg">
              <input
                type="color"
                value={userColor}
                onChange={handleColorChange}
                className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
              />
              <span className="text-xs text-gray-300 font-mono flex-1">{userColor}</span>
              {userColor !== '#2563eb' && (
                <button
                   onClick={resetColor}
                   className="text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  Mặc định
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header - Transparent if bgImage exists */}
      <div className={`h-16 px-4 border-b flex justify-between items-center shrink-0 z-10 transition-colors ${bgImage ? 'bg-gray-900/80 border-white/10 backdrop-blur-sm' : 'bg-gray-900 border-gray-800'}`}>
        <div className="flex items-center gap-3">
            <div className="bg-blue-500/10 p-2 rounded-lg">
                <MessageCircle size={20} className="text-blue-500" />
            </div>
            <div>
                <h2 className="font-bold text-white text-sm">Chat Room</h2>
                <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-xs text-gray-400">{messages.length} tin nhắn</span>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-blue-500/20 text-blue-400' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}
              title="Cài đặt giao diện"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={onChangeName}
              className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
              title="Đổi tên"
            >
              <Edit2 size={18} />
            </button>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent z-10 relative">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-60">
            <MessageCircle size={48} strokeWidth={1} className="mb-2" />
            <p className="text-sm">Chưa có tin nhắn nào.</p>
            <p className="text-xs">Hãy là người đầu tiên nhắn tin!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender === username;
            const isSequence = index > 0 && messages[index - 1].sender === msg.sender;

            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${isSequence ? 'mt-1' : 'mt-4'}`}>
                {!isMe && !isSequence && (
                    <div className="ml-1 mb-1 text-xs text-gray-400 font-medium flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-[10px] text-white uppercase">
                            {msg.sender[0]}
                        </div>
                        {msg.sender}
                    </div>
                )}

                <div
                    className={`max-w-[85%] px-4 py-2.5 text-sm shadow-sm ${
                        isMe
                            ? 'text-white rounded-2xl rounded-tr-sm'
                            : 'bg-gray-800 text-gray-200 rounded-2xl rounded-tl-sm border border-gray-700'
                    }`}
                    style={isMe ? { backgroundColor: userColor } : undefined}
                >
                  <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className={`p-4 border-t shrink-0 z-10 transition-colors ${bgImage ? 'bg-gray-900/80 border-white/10 backdrop-blur-sm' : 'bg-gray-900 border-gray-800'}`}>
        <form onSubmit={sendMessage} className="relative flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={username ? "Nhập tin nhắn..." : "Đặt tên để chat..."}
            disabled={!username}
            className="flex-1 bg-gray-800/50 text-white rounded-xl pl-4 pr-12 py-3 text-sm border border-gray-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-gray-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || !username}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white p-1.5 rounded-lg disabled:opacity-0 disabled:pointer-events-none transition-all duration-200"
            style={{ backgroundColor: userColor }}
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
