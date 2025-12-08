'use client';

import { useState, useEffect, useRef } from 'react';
import { roomService } from '@/lib/services/roomService';
import { onValue } from 'firebase/database';
import { Send, MessageCircle, Edit2, Settings, Image as ImageIcon, Palette, Trash2, X, Sliders } from 'lucide-react';
import toast from 'react-hot-toast';

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
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const initialLoadRef = useRef(true);
  const lastMessageTimeRef = useRef<number>(0);

  // Customization State
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [userColor, setUserColor] = useState('#2563eb'); // Default blue-600
  const [showSettings, setShowSettings] = useState(false);

  // New State for Blur and Overlay
  const [bgBlur, setBgBlur] = useState(8);
  const [bgOverlay, setBgOverlay] = useState(40);

  // Load local settings (user color)
  useEffect(() => {
    if (typeof window !== 'undefined') {
        const savedColor = localStorage.getItem('chat_user_color');
        if (savedColor) setUserColor(savedColor);

        // Initialize audio (short beep)
        audioRef.current = new Audio('data:audio/wav;base64,UklGRuBXBwBXQVZFZm10IBAAAAABAAEAgLsAAAB3AQACABAAZGF0YVpUBwCx/5T/O/9P/3j/mP90/3b/ZP9G/zL/R/9S/4z/n/+4/7n/tf+d/yH/dv6i/e38avwp/B79KP/zAPcAs//E/tX+Lf+e/7wAEwOKBtwIFQnCBxkI4AksDToPBREREb8N0gWe9TLqouln9IT9H/zg9ZH11PJZ7ozkHds95EXziv8a93/yA/R990f5j/mgCmcdfCMoHL0USxYXFr4LGPVb9B8AIQjG/U/4WQFpCsMAjPMy8QUFrBXBFM0LBA1PEf0SSQRL+mAA1Q2eEpEQZQ3EBxf2G+GZ2ezp0Ph7+sPwmu5F6YXfjMpKwfLNPOpn8pDooujU7if6AP3dB9glAjgwO88uHC/NNF8yrRsnDbYTsR5rFvj8y/M++r76o+4B42ro0gKDDmcHZf8R/7D/UvlE6JrrmfyCC6AMyQroCzMIZ/a95bTuMAYOD4ME7vhP9sXw999jxsbBMNci8GPos+HJ4ebq6PRL+U4PBCl1MKorWCRdK2su9CNVC/4LTRntJm0ZwQoQBq4I+/+f9XDt1/3iEVIXUQ+rB078evHO3uLYieZG9XP8XgG6CMcUcxAu/gbqVOgi7zD41vqU/ef6tfWO7dbZGs9AzSDVgeen+0f+A/Ma9kb6fgdzBZEMKyHENE4/VDiEM8gwvCuNGrwScRiPGeYJN/ed9igAR/gV6j7llvcyDEYHvey739vkYvZ');
    }
  }, []);

  // Subscribe to room settings (background)
  useEffect(() => {
    if (!roomId) return;

    const settingsRef = roomService.getSettingsRef(roomId);
    if (!settingsRef) return;

    const unsubscribe = onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        if (data.bgImage) setBgImage(data.bgImage);
        else setBgImage(null);

        if (data.bgBlur !== undefined) setBgBlur(data.bgBlur);
        if (data.bgOverlay !== undefined) setBgOverlay(data.bgOverlay);
      } else {
        setBgImage(null);
        setBgBlur(8);
        setBgOverlay(40);
      }
    });

    return () => unsubscribe();
  }, [roomId]);

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
      setIsDataLoaded(true);
    });

    return () => unsubscribe();
  }, [roomId]);

  // Effect to handle notifications when messages change
  useEffect(() => {
    if (!isDataLoaded) return;

    if (initialLoadRef.current) {
        initialLoadRef.current = false;
        if (messages.length > 0) {
            lastMessageTimeRef.current = messages[messages.length - 1].timestamp;
        }
        return;
    }

    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];

    // Check if it's a new message (timestamp is greater than last seen)
    if (lastMessage.timestamp > lastMessageTimeRef.current) {
        lastMessageTimeRef.current = lastMessage.timestamp;

        // Check if the message is from another user
        if (lastMessage.sender !== username) {
            // Play sound
            if (audioRef.current) {
                audioRef.current.play().catch(e => console.error("Error playing sound:", e));
            }

            // Show toast
            toast(`${lastMessage.sender}: ${lastMessage.text}`, {
                icon: '💬',
                style: {
                    borderRadius: '10px',
                    background: '#1f2937',
                    color: '#fff',
                },
            });
        }
    }
  }, [messages, username, isDataLoaded]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Vui lòng chọn file ảnh hợp lệ');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Ảnh quá lớn. Vui lòng chọn ảnh dưới 5MB để đảm bảo hiệu năng.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // setBgImage(result); // Will be updated via listener
        roomService.updateSettings(roomId, { bgImage: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    // setBgImage(null); // Will be updated via listener
    roomService.updateSettings(roomId, { bgImage: null });
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

  const handleBlurChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setBgBlur(value);
    roomService.updateSettings(roomId, { bgBlur: value });
  };

  const handleOverlayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setBgOverlay(value);
    roomService.updateSettings(roomId, { bgOverlay: value });
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-gray-900 justify-between">
      {/* Background Layer */}
      {bgImage && (
        <>
          <div
            className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-300"
            style={{
              backgroundImage: `url("${bgImage}")`,
              filter: `blur(${bgBlur}px)`,
              transform: 'scale(1.1)', // Prevent blurred edges
            }}
          />
          {/* Dark Overlay for Readability */}
          <div
            className="absolute inset-0 z-0 transition-all duration-300"
            style={{ backgroundColor: `rgba(0,0,0, ${bgOverlay / 100})` }}
          />
        </>
      )}

      {/* Settings Modal/Panel */}
      {showSettings && (
        <div className="absolute top-16 right-4 z-30 w-[calc(100%-2rem)] max-w-[18rem] bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-xl shadow-2xl p-4 animate-in fade-in slide-in-from-top-2 max-h-[80vh] overflow-y-auto custom-scrollbar">
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
          <div className="mb-4 space-y-3">
            <div>
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

            {bgImage && (
                <div className="space-y-3 p-3 bg-gray-700/30 rounded-lg border border-gray-700/50">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                                <Sliders size={12} /> Độ mờ (Blur)
                            </label>
                            <span className="text-[10px] text-gray-500 font-mono">{bgBlur}px</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="20"
                            value={bgBlur}
                            onChange={handleBlurChange}
                            className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                                <Sliders size={12} /> Độ tối nền
                            </label>
                            <span className="text-[10px] text-gray-500 font-mono">{bgOverlay}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="90"
                            value={bgOverlay}
                            onChange={handleOverlayChange}
                            className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>
                </div>
            )}
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent z-10 relative min-h-0">
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
