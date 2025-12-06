'use client';

import { useState, useEffect, useRef } from 'react';
import { roomService } from '@/lib/services/roomService';
import { onValue } from 'firebase/database';
import { Send, MessageCircle, Edit2 } from 'lucide-react';

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

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="h-16 px-4 bg-gray-900 border-b border-gray-800 flex justify-between items-center shrink-0 shadow-sm z-10">
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
        <button
          onClick={onChangeName}
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
                            ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
                            : 'bg-gray-800 text-gray-200 rounded-2xl rounded-tl-sm border border-gray-700'
                    }`}
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
      <div className="p-4 bg-gray-900 border-t border-gray-800 shrink-0">
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
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-500 text-white p-1.5 rounded-lg disabled:opacity-0 disabled:pointer-events-none transition-all duration-200"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
