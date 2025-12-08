import { Music, MessageCircle } from 'lucide-react';

/**
 * Props for the MobileNav component.
 */
interface MobileNavProps {
  /** The currently active tab ('music' or 'chat'). */
  activeTab: 'music' | 'chat';
  /** Callback function to set the active tab. */
  setActiveTab: (tab: 'music' | 'chat') => void;
  /** The number of unread messages to display as a badge on the chat icon. Defaults to 0. */
  unreadCount?: number;
}

/**
 * A bottom navigation bar component for mobile devices.
 * Allows switching between the Music and Chat views.
 *
 * @param props - The component props.
 * @returns The rendered navigation bar.
 */
export default function MobileNav({ activeTab, setActiveTab, unreadCount = 0 }: MobileNavProps) {
  return (
    <div className="md:hidden h-16 bg-gray-900 border-t border-gray-800 flex fixed bottom-0 left-0 w-full z-30">
      <button
        onClick={() => setActiveTab('music')}
        className={`flex-1 flex flex-col items-center justify-center gap-1 ${
          activeTab === 'music' ? 'text-blue-500' : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <Music size={24} />
        <span className="text-xs font-medium">Nhạc</span>
      </button>

      <button
        onClick={() => setActiveTab('chat')}
        className={`flex-1 flex flex-col items-center justify-center gap-1 relative ${
          activeTab === 'chat' ? 'text-blue-500' : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <div className="relative">
          <MessageCircle size={24} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        <span className="text-xs font-medium">Chat</span>
      </button>
    </div>
  );
}
