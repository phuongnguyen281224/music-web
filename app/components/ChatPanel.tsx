'use client';

import { useState, useEffect, useRef } from 'react';
import { ref, onValue, push, serverTimestamp } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Send, User, MessageCircle, MoreVertical, Edit2 } from 'lucide-react';

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

interface ChatPanelProps {
  roomId: string;
}

export default function ChatPanel({ roomId }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState<string>('');
  const [isNameSet, setIsNameSet] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize user
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem('chat_username');
      if (storedName) {
        setUsername(storedName);
        setIsNameSet(true);
      }
    }
  }, []);

  // Subscribe to messages
  useEffect(() => {
    if (!roomId || !database) return;

    const messagesRef = ref(database, `rooms/${roomId}/messages`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messageList = Object.entries(data).map(([key, value]: [string, any]) => ({
          id: key,
          ...value,
        }));
        // Sort by timestamp just in case, though Firebase pushes are usually chronological
        // Ideally we should sort by timestamp, but order in object is not guaranteed.
        // Assuming push keys are time-ordered.
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

  const handleSetUsername = () => {
    if (username.trim()) {
      localStorage.setItem('chat_username', username.trim());
      setIsNameSet(true);
    }
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !username) return;

    if (!database) {
      const msg: Message = {
        id: Date.now().toString(),
        sender: username,
        text: newMessage.trim(),
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, msg]);
      setNewMessage('');
      return;
    }

    const messagesRef = ref(database, `rooms/${roomId}/messages`);
    push(messagesRef, {
      sender: username,
      text: newMessage.trim(),
      timestamp: serverTimestamp(),
    });

    setNewMessage('');
  };

  if (!isNameSet) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 bg-gray-900 text-white relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

        <div className="w-full max-w-sm bg-gray-800/50 backdrop-blur-md p-8 rounded-2xl border border-gray-700 shadow-xl relative z-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <User className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white">Tham gia Chat</h3>
            <p className="text-gray-400 text-sm mt-2">Nhập tên của bạn để bắt đầu trò chuyện</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Tên hiển thị</label>
                <input
                    type="text"
                    placeholder="VD: Minh"
                    className="w-full p-3 bg-gray-900/50 border border-gray-600 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-gray-600"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSetUsername()}
                    autoFocus
                />
            </div>
            <button
                onClick={handleSetUsername}
                disabled={!username.trim()}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98]"
            >
                Vào phòng chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="h-16 px-4 bg-gray-900 border-b border-gray-800 flex justify-between items-center shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
            <div className="bg-blue-500/10 p-2 rounded-lg">
                <MessageCircle size={20} className="text-blue-500" />
            </div>
            <div>
                <div className="flex items-center gap-2">
                    <h2 className="font-bold text-white text-sm">Chat Room</h2>
                    {!database && <span className="text-[10px] px-1.5 py-0.5 bg-gray-700 rounded text-gray-300">Local</span>}
                </div>
                <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full animate-pulse ${database ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                    <span className="text-xs text-gray-400">{messages.length} tin nhắn</span>
                </div>
            </div>
        </div>
        <button
          onClick={() => {
            if (confirm('Bạn muốn đổi tên?')) {
                localStorage.removeItem('chat_username');
                setIsNameSet(false);
                setUsername('');
            }
          }}
          className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
          title="Đổi tên"
        >
          <Edit2 size={16} />
        </button>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-60">
            <MessageCircle size={48} strokeWidth={1} className="mb-2" />
            <p className="text-sm">Chưa có tin nhắn nào.</p>
            <p className="text-xs">Hãy là người đầu tiên nhắn tin!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender === username;
            // Check if previous message was from same sender to group them (optional, simple logic)
            const isSequence = index > 0 && messages[index - 1].sender === msg.sender;

            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${isSequence ? 'mt-1' : 'mt-4'}`}>
                {!isMe && !isSequence && (
                    <div className="ml-1 mb-1 text-xs text-gray-400 font-medium flex items-center gap-2">
                        {/* Placeholder avatar logic */}
                        <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-[10px] text-white uppercase">
                            {msg.sender[0]}
                        </div>
                        {msg.sender}
                    </div>
                )}

                <div
                    className={`max-w-[85%] px-4 py-2.5 text-sm shadow-sm ${
                        isMe
                            ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
                            : 'bg-gray-800 text-gray-200 rounded-2xl rounded-tl-sm border border-gray-700'
                    }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                </div>
                {/* Optional timestamp could go here */}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-gray-900 border-t border-gray-800 shrink-0">
        <form onSubmit={sendMessage} className="relative flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Nhập tin nhắn..."
            className="flex-1 bg-gray-800/50 text-white rounded-xl pl-4 pr-12 py-3 text-sm border border-gray-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-500 text-white p-1.5 rounded-lg disabled:opacity-0 disabled:pointer-events-none transition-all duration-200"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
