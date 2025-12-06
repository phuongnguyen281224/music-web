'use client';

import { useState, useEffect, useRef } from 'react';
import { ref, onValue, push, serverTimestamp } from 'firebase/database';
import { database } from '@/lib/firebase';
import { Send, User } from 'lucide-react';

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
        // Sort by timestamp if needed, but Firebase pushes are usually chronological
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
    if (!newMessage.trim() || !username || !database) return;

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
      <div className="flex flex-col items-center justify-center h-full p-6 bg-gray-800 text-white">
        <div className="w-full max-w-xs space-y-4">
          <div className="text-center">
            <User className="w-12 h-12 mx-auto mb-2 text-blue-400" />
            <h3 className="text-lg font-bold">Tham gia Chat</h3>
          </div>
          <input
            type="text"
            placeholder="Nhập tên hiển thị..."
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSetUsername()}
          />
          <button
            onClick={handleSetUsername}
            disabled={!username.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            Vào Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-700">
      {/* Header */}
      <div className="p-3 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
        <h2 className="font-bold text-white flex items-center gap-2">
          Chat Room
        </h2>
        <button
          onClick={() => {
            localStorage.removeItem('chat_username');
            setIsNameSet(false);
            setUsername('');
          }}
          className="text-xs text-gray-400 hover:text-white"
        >
          Đổi tên ({username})
        </button>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center text-sm mt-4">Chưa có tin nhắn nào.</p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender === username;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  isMe
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-gray-700 text-gray-200 rounded-bl-none'
                }`}>
                  {!isMe && <div className="text-xs text-blue-300 mb-1 font-bold">{msg.sender}</div>}
                  <p>{msg.text}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={sendMessage} className="p-3 bg-gray-800 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Nhập tin nhắn..."
            className="flex-1 bg-gray-700 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
