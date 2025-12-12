'use client';

import { useEffect, useState, useRef } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { LogOut, Play, Link as LinkIcon, AlertTriangle, Info, Users, User, X, ListMusic, Plus, Trash2, ChevronUp, ChevronDown, Search, Loader2, History, Monitor } from 'lucide-react';
import ChatPanel from '@/app/components/ChatPanel';
import MobileNav from '@/app/components/MobileNav';
import FocusPanel from '@/app/components/FocusPanel';
import { useRoom } from '@/hooks/useRoom';
import { usePresence } from '@/hooks/usePresence';
import { searchYouTube, YouTubeVideo } from '@/lib/youtube';
import Image from 'next/image';

/**
 * Props for the Room component.
 */
interface RoomProps {
  /** Promise resolving to route parameters, containing the room ID. */
  params: Promise<{ id: string }>;
}

/**
 * The main Room component containing the music player, queue, and chat.
 * Handles synchronization, user presence, and layout adaptation (desktop/mobile).
 *
 * @param props - The component props.
 * @returns The rendered Room page.
 */
export default function Room({ params }: RoomProps) {
  const {
      roomId,
      isHost,
      status,
      playerState,
      serverTimeOffset,
      updatePlayer,
      changeVideo,
      addToQueue,
      removeFromQueue,
      playNext,
      moveItem,
      queue,
      history,
      isRemoteUpdate
  } = useRoom('', params);

  const {
      username,
      setUserName,
      isNameSet,
      participants
  } = usePresence(roomId);

  const [inputUrl, setInputUrl] = useState('');
  const [showParticipants, setShowParticipants] = useState(false);
  const [tempName, setTempName] = useState('');
  const [showNameModal, setShowNameModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Responsive & Mobile State
  const [activeTab, setActiveTab] = useState<'music' | 'chat'>('music');
  const [isMobile, setIsMobile] = useState(false);

  // Focus Mode State
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Local Player Refs
  const playerRef = useRef<any>(null);
  const isProcessingEnd = useRef(false);

  // Reset processing flag when video changes
  useEffect(() => {
      isProcessingEnd.current = false;
  }, [playerState.videoId]);

  // Watchdog for background tab throttling issues
  useEffect(() => {
      const interval = setInterval(() => {
          if (!playerRef.current) return;
          try {
              const state = playerRef.current.getPlayerState();
              if (state === 0 && !isProcessingEnd.current) {
                  console.log("Watchdog detected ENDED state, forcing next.");
                  isProcessingEnd.current = true;
                  if (queue.length > 0) {
                      playNext();
                  } else {
                      updatePlayer({ isPlaying: false, timestamp: 0 });
                  }
              }
          } catch (e) {
              // Ignore errors if player is not ready
          }
      }, 1000);
      return () => clearInterval(interval);
  }, [queue, playNext, updatePlayer]);

  // Sync Video Logic
  useEffect(() => {
      if (!roomId || !playerState) return;

      if (playerRef.current) {
          try {
              const currentPlayerState = playerRef.current.getPlayerState();
              let expectedTime = playerState.timestamp;
              if (playerState.isPlaying && playerState.updatedAt) {
                  const estimatedServerTime = Date.now() + serverTimeOffset;
                  const diff = (estimatedServerTime - playerState.updatedAt) / 1000;
                  if (diff > 0) expectedTime += diff;
              }

              const currentTime = playerRef.current.getCurrentTime();
              if (Math.abs(currentTime - expectedTime) > 1.5) {
                 isRemoteUpdate.current = true;
                 playerRef.current.seekTo(expectedTime, true);
              }

              if (playerState.isPlaying && currentPlayerState !== 1) {
                  isRemoteUpdate.current = true;
                  playerRef.current.playVideo();
              } else if (!playerState.isPlaying && currentPlayerState !== 2) {
                  isRemoteUpdate.current = true;
                  playerRef.current.pauseVideo();
              }
          } catch (error) {
              console.warn("Error syncing player state:", error);
          }
      }
      setTimeout(() => { isRemoteUpdate.current = false; }, 500);
      // Added isRemoteUpdate to dependency array to satisfy linter
  }, [playerState, serverTimeOffset, roomId, isRemoteUpdate]);

  // Initial Name Modal Check
  useEffect(() => {
      if (!isNameSet && roomId) {
          setShowNameModal(true);
      } else {
          setShowNameModal(false);
      }
  }, [isNameSet, roomId]);

  // Mobile Detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handlers
  const onPlayerStateChange = (event: any) => {
    if (isRemoteUpdate.current) return;
    const currentTime = event.target.getCurrentTime();

    // Playing
    if (event.data === 1) updatePlayer({ isPlaying: true, timestamp: currentTime });
    // Paused
    else if (event.data === 2) updatePlayer({ isPlaying: false, timestamp: currentTime });
    // Ended
    else if (event.data === 0) {
        if (!isProcessingEnd.current) {
            isProcessingEnd.current = true;
            if (queue.length > 0) {
                playNext();
            } else {
                updatePlayer({ isPlaying: false, timestamp: 0 });
            }
        }
    }
  };

  const handlePlayNow = async () => {
    if (await changeVideo(inputUrl)) setInputUrl('');
    else alert('Link không hợp lệ');
  };

  const handleAddToQueue = async (url: string = inputUrl) => {
      if (!url.trim()) return;
      setIsAdding(true);
      const success = await addToQueue(url, username || 'Ẩn danh');
      setIsAdding(false);
      if (success) {
          if (url === inputUrl) setInputUrl('');
      } else {
          alert('Link không hợp lệ hoặc lỗi kết nối');
      }
  };

  const handleSearch = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!searchQuery.trim()) return;

      setIsSearching(true);
      setShowSearchModal(true);
      const results = await searchYouTube(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
  };

  const handleSearchResultClick = (video: YouTubeVideo, action: 'play' | 'queue') => {
      const url = `https://www.youtube.com/watch?v=${video.id}`;
      if (action === 'play') {
          changeVideo(url, {
              title: video.title,
              thumbnail: video.thumbnail,
              addedBy: username
          });
          setShowSearchModal(false);
      } else {
          handleAddToQueue(url);
          setShowSearchModal(false);
      }
  };

  const onPlayerReady = (event: any) => playerRef.current = event.target;

  const handleSaveName = () => {
      if (tempName.trim()) {
          setUserName(tempName);
          setShowNameModal(false);
      }
  };

  const handleChangeName = () => {
      setTempName(username);
      setShowNameModal(true);
  };

  // UI Components
  const opts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      controls: 1,
      playsinline: 1
    },
  };

  const ResizeHandle = () => (
    <PanelResizeHandle className="w-4 bg-gray-900 flex items-center justify-center cursor-col-resize group relative z-10 -ml-2 hover:ml-0 transition-all">
      <div className="w-1 h-12 bg-gray-700 group-hover:bg-blue-500 rounded-full transition-colors duration-200" />
    </PanelResizeHandle>
  );

  // --- Panels Content ---

  const musicPanelContent = (
    <div className="h-full flex flex-col relative">
        {/* Focus Mode Overlay */}
        {isFocusMode && !isMobile && (
            <FocusPanel onClose={() => setIsFocusMode(false)} />
        )}

        {/* Header */}
        <div className="h-16 border-b border-gray-800 flex items-center justify-between px-4 md:px-6 bg-gray-900 sticky top-0 z-20 shadow-sm">
            <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
                <h1 className="text-xl font-bold tracking-tight text-white flex flex-col md:flex-row md:items-center md:gap-2">
                    <span>Phòng</span>
                    <span className="text-blue-400 font-mono text-sm md:text-xl">{roomId}</span>
                </h1>
                {!process.env.NEXT_PUBLIC_FIREBASE_API_KEY && (
                    <span className="ml-4 flex items-center gap-1 text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded border border-red-900/50 hidden md:flex">
                        <AlertTriangle size={12} /> Config Error
                    </span>
                )}
            </div>
            <div className="flex items-center gap-2 md:gap-3">
                 {/* Focus Mode Toggle */}
                 <button
                    onClick={() => setIsFocusMode(!isFocusMode)}
                    className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium border border-gray-700 hidden md:flex"
                    title="Chế độ tập trung"
                >
                    <Monitor size={16} />
                    <span className="hidden lg:inline">Focus Mode</span>
                </button>

                <button
                    onClick={() => setShowParticipants(true)}
                    className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium border border-gray-700"
                >
                    <Users size={16} />
                    <span className="hidden sm:inline">Thành viên ({Object.values(participants).filter(p => p.online).length})</span>
                </button>
                <button
                    onClick={() => window.location.href = '/'}
                    className="flex items-center gap-2 bg-gray-800 hover:bg-red-600/90 hover:text-white text-gray-300 px-3 py-2 md:px-4 md:py-2 rounded-lg transition-all duration-200 text-sm font-medium border border-gray-700 hover:border-red-500"
                >
                    <LogOut size={16} />
                    <span className="hidden sm:inline">Rời Phòng</span>
                </button>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center">
            <div className="w-full max-w-5xl space-y-6 pb-20 md:pb-0"> {/* Padding bottom for mobile nav */}

                {/* Search Bar */}
                <form onSubmit={handleSearch} className="relative group z-10">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                        <Search size={18} />
                    </div>
                    <input
                        type="text"
                        placeholder="Tìm kiếm bài hát trên YouTube..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-800/50 border border-gray-700 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 placeholder-gray-500 transition-all shadow-sm"
                    />
                    <button
                        type="submit"
                        disabled={!searchQuery.trim() || isSearching}
                        className="absolute right-2 top-2 bg-blue-600 hover:bg-blue-500 text-white p-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    </button>
                </form>

                {/* Status Bar */}
                <div className="flex items-center justify-between text-sm bg-gray-800/50 px-4 py-2 rounded-lg border border-gray-700/50">
                    <div className="flex items-center gap-2 text-gray-400">
                        <Info size={16} />
                        <span>Trạng thái: {status}</span>
                    </div>
                    <div className="flex items-center gap-2 text-blue-400 bg-blue-900/20 px-3 py-1 rounded-full text-xs font-medium">
                        <Info size={12} />
                        Đang đồng bộ
                    </div>
                </div>

                {!process.env.NEXT_PUBLIC_FIREBASE_API_KEY && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
                        <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
                        <div className="text-sm text-red-200">
                            <p className="font-bold mb-1">Thiếu cấu hình Firebase</p>
                            <p>Vui lòng tạo file <code className="bg-black/30 px-1 py-0.5 rounded">.env.local</code> và điền thông tin API Key.</p>
                        </div>
                    </div>
                )}

                {!process.env.NEXT_PUBLIC_YOUTUBE_API_KEY && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 flex items-start gap-3">
                        <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={20} />
                        <div className="text-sm text-yellow-200">
                            <p className="font-bold mb-1">Thiếu cấu hình YouTube</p>
                            <p>Chức năng tìm kiếm sẽ không hoạt động. Vui lòng thêm <code className="bg-black/30 px-1 py-0.5 rounded">NEXT_PUBLIC_YOUTUBE_API_KEY</code> vào file <code className="bg-black/30 px-1 py-0.5 rounded">.env.local</code>.</p>
                        </div>
                    </div>
                )}

                {/* Video Player */}
                {/* Important: We keep the player in the DOM but potentially hidden by the Focus Overlay */}
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                    <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-800">
                        <YouTube
                            videoId={playerState.videoId}
                            opts={opts}
                            onReady={onPlayerReady}
                            onStateChange={onPlayerStateChange}
                            className="absolute top-0 left-0 w-full h-full"
                        />
                    </div>
                </div>

                {/* Host Controls */}
                <div className="bg-gray-800/40 p-1 rounded-xl border border-gray-700/50 flex items-center shadow-lg backdrop-blur-sm">
                    <div className="pl-4 pr-3 text-gray-500">
                        <LinkIcon size={20} />
                    </div>
                    <input
                        type="text"
                        placeholder="Dán link YouTube tại đây..."
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handlePlayNow()}
                        className="flex-1 bg-transparent border-none text-white placeholder-gray-500 focus:outline-none focus:ring-0 py-3 text-sm"
                    />
                    <div className="flex items-center gap-1 m-1">
                        <button
                            onClick={() => handleAddToQueue(inputUrl)}
                            disabled={isAdding || !inputUrl}
                            className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2.5 md:px-4 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            title="Thêm vào danh sách chờ"
                        >
                            <Plus size={16} />
                            <span className="hidden md:inline">Thêm</span>
                        </button>
                        <button
                            onClick={handlePlayNow}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 md:px-6 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95 text-sm"
                        >
                            <Play size={16} fill="currentColor" />
                            <span className="hidden md:inline">Phát ngay</span>
                        </button>
                    </div>
                </div>

                {/* Queue List */}
                <div className="bg-gray-900/40 rounded-xl border border-gray-800 overflow-hidden">
                    <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                        <h3 className="font-bold flex items-center gap-2 text-white">
                            <ListMusic size={20} className="text-blue-500" />
                            Danh sách phát ({queue.length})
                        </h3>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-800/50">
                        {queue.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <ListMusic size={40} className="mx-auto mb-3 opacity-20" />
                                <p>Chưa có bài hát nào trong hàng đợi</p>
                            </div>
                        ) : (
                            queue.map((item, index) => (
                                <div key={item.id} className="p-3 hover:bg-gray-800/50 transition-colors flex items-center gap-3 group">
                                    <div className="text-gray-500 text-sm font-mono w-6 text-center">
                                        {index + 1}
                                    </div>
                                    <div className="w-16 h-9 bg-gray-800 rounded overflow-hidden shrink-0 relative">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-white truncate" title={item.title}>
                                            {item.title}
                                        </div>
                                        <div className="text-xs text-gray-500 truncate">
                                            Thêm bởi: {item.addedBy}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => moveItem(item.id, 'up')}
                                            disabled={index === 0}
                                            className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <ChevronUp size={16} />
                                        </button>
                                        <button
                                            onClick={() => moveItem(item.id, 'down')}
                                            disabled={index === queue.length - 1}
                                            className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <ChevronDown size={16} />
                                        </button>
                                        <button
                                            onClick={() => removeFromQueue(item.id)}
                                            className="p-1.5 hover:bg-red-900/50 rounded text-gray-400 hover:text-red-400 ml-1"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* History List */}
                <div className="bg-gray-900/20 rounded-xl border border-gray-800 overflow-hidden">
                    <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/40">
                        <h3 className="font-bold flex items-center gap-2 text-gray-400">
                            <History size={20} className="text-gray-500" />
                            Lịch sử phát gần đây
                        </h3>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto divide-y divide-gray-800/30">
                        {history.length === 0 ? (
                            <div className="p-6 text-center text-gray-600 text-sm">
                                <p>Chưa có lịch sử phát</p>
                            </div>
                        ) : (
                            history.map((item) => (
                                <div key={item.id} className="p-3 hover:bg-gray-800/30 transition-colors flex items-center gap-3 group opacity-70 hover:opacity-100">
                                    <div className="w-16 h-9 bg-gray-800 rounded overflow-hidden shrink-0 relative grayscale group-hover:grayscale-0 transition-all">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-gray-300 truncate" title={item.title}>
                                            {item.title}
                                        </div>
                                        <div className="text-xs text-gray-600 truncate">
                                            Nghe lúc: {new Date(item.playedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => changeVideo(`https://www.youtube.com/watch?v=${item.videoId}`, {
                                                title: item.title,
                                                thumbnail: item.thumbnail,
                                                addedBy: username
                                            })}
                                            className="p-1.5 hover:bg-blue-600 rounded text-gray-400 hover:text-white"
                                            title="Phát lại"
                                        >
                                            <Play size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleAddToQueue(`https://www.youtube.com/watch?v=${item.videoId}`)}
                                            className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
                                            title="Thêm vào hàng đợi"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    </div>
  );

  const chatPanelContent = (
    <div className="h-full pb-16 md:pb-0"> {/* Padding for mobile nav */}
        {roomId && (
            <ChatPanel
                roomId={roomId}
                username={username}
                onChangeName={handleChangeName}
            />
        )}
    </div>
  );

  return (
    <div className="flex h-dvh w-full bg-gray-950 text-white overflow-hidden relative">

        {/* Search Results Modal */}
        {showSearchModal && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowSearchModal(false)}>
                <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-2xl shadow-2xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-800">
                        <h3 className="font-bold text-xl flex items-center gap-2 text-white">
                            <Search size={24} className="text-blue-500"/>
                            Kết quả tìm kiếm
                        </h3>
                        <button onClick={() => setShowSearchModal(false)} className="text-gray-400 hover:text-white p-1 hover:bg-gray-800 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-2">
                        {isSearching ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                <Loader2 size={40} className="animate-spin mb-4 text-blue-500" />
                                <p>Đang tìm kiếm...</p>
                            </div>
                        ) : searchResults.length === 0 ? (
                            <div className="text-center text-gray-500 py-12">
                                <Search size={40} className="mx-auto mb-3 opacity-20" />
                                <p>Không tìm thấy kết quả nào</p>
                            </div>
                        ) : (
                            searchResults.map((video) => (
                                <div key={video.id} className="flex gap-4 p-3 hover:bg-gray-800/50 rounded-xl transition-all group border border-transparent hover:border-gray-700/50">
                                    <div className="w-32 aspect-video bg-gray-800 rounded-lg overflow-hidden shrink-0 relative shadow-sm">
                                        {/* Fixed: Use next/image or disable lint for this line. Used <img> with lint disable comment for remote image simplicity without whitelisting domains */}
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                        <div>
                                            <h4 className="font-medium text-white line-clamp-2 leading-snug mb-1" title={video.title}>
                                                {video.title}
                                            </h4>
                                            <p className="text-xs text-gray-400 flex items-center gap-1">
                                                <User size={12} />
                                                {video.channelTitle}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <button
                                                onClick={() => handleSearchResultClick(video, 'play')}
                                                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                                            >
                                                <Play size={14} fill="currentColor" /> Phát ngay
                                            </button>
                                            <button
                                                onClick={() => handleSearchResultClick(video, 'queue')}
                                                disabled={isAdding}
                                                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isAdding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                                <span className="truncate">Thêm vào hàng đợi</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Name Modal */}
        {showNameModal && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
                    {isNameSet && (
                        <button
                            onClick={() => setShowNameModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                    )}
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                            <User className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-white">
                            {isNameSet ? 'Đổi tên hiển thị' : 'Tham gia phòng nhạc'}
                        </h2>
                        <p className="text-gray-400 text-sm mt-2">
                            {isNameSet ? 'Nhập tên mới của bạn' : 'Vui lòng nhập tên để mọi người nhận ra bạn'}
                        </p>
                    </div>
                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="Tên của bạn..."
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                            autoFocus
                            className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        />
                        <button
                            onClick={handleSaveName}
                            disabled={!tempName.trim()}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98]"
                        >
                            {isNameSet ? 'Lưu thay đổi' : 'Vào phòng'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Participants Modal / Overlay */}
        {showParticipants && (
             <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowParticipants(false)}>
                <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-800">
                        <h3 className="font-bold flex items-center gap-2">
                            <Users size={20} className="text-blue-500"/>
                            Danh sách người tham gia
                        </h3>
                        <button onClick={() => setShowParticipants(false)} className="text-gray-400 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                        {Object.entries(participants).map(([id, p]) => (
                            <div key={id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${p.online ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
                                        {p.name[0]?.toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-white flex items-center gap-2">
                                            {p.name}
                                            {p.name === username && <span className="text-[10px] bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded">Bạn</span>}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {p.online ? 'Đang hoạt động' : 'Đã rời phòng'}
                                        </div>
                                    </div>
                                </div>
                                <div className={`w-2 h-2 rounded-full ${p.online ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-gray-600'}`}></div>
                            </div>
                        ))}
                         {Object.keys(participants).length === 0 && (
                            <p className="text-center text-gray-500 py-4 text-sm">Chưa có ai khác trong phòng</p>
                        )}
                    </div>
                </div>
             </div>
        )}

        {isMobile ? (
            <div className="flex-1 w-full relative overflow-hidden">
                <div className={`absolute inset-0 flex flex-col transition-opacity duration-300 ${activeTab === 'music' ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'}`}>
                    {musicPanelContent}
                </div>
                 <div className={`absolute inset-0 flex flex-col transition-opacity duration-300 ${activeTab === 'chat' ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'}`}>
                    {chatPanelContent}
                </div>
                <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
            </div>
        ) : (
            <PanelGroup direction="horizontal">
                {/* Music Panel */}
                <Panel defaultSize={75} minSize={30} className="bg-gray-900/50">
                    {musicPanelContent}
                </Panel>

                <ResizeHandle />

                {/* Chat Panel */}
                <Panel defaultSize={25} minSize={20} className="bg-gray-900 border-l border-gray-800">
                    {chatPanelContent}
                </Panel>
            </PanelGroup>
        )}
    </div>
  );
}
