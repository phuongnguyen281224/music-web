'use client';

import { useEffect, useState, useRef } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import { ref, onValue, set, update, serverTimestamp, push, child, get } from "firebase/database";
import { database } from '@/lib/firebase';
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { LogOut, Play, Link as LinkIcon, AlertTriangle, Info, CheckCircle, GripVertical } from 'lucide-react';
import ChatPanel from '@/app/components/ChatPanel';

interface RoomProps {
  params: Promise<{ id: string }>;
}

interface RoomState {
    videoId: string;
    isPlaying: boolean;
    timestamp: number; // The video time when the update happened
    updatedAt: number; // Server timestamp of the update
}

export default function Room({ params }: RoomProps) {
  const [roomId, setRoomId] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('Đang kết nối Firebase...');
  const [videoId, setVideoId] = useState<string>('dQw4w9WgXcQ');
  const [inputUrl, setInputUrl] = useState('');
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);

  // Player state refs
  const playerRef = useRef<any>(null);
  const isRemoteUpdate = useRef(false);
  const roomRef = useRef<any>(null);
  const lastSyncData = useRef<RoomState | null>(null);

  useEffect(() => {
    const unwrapParams = async () => {
      const resolvedParams = await params;
      setRoomId(resolvedParams.id);

      // Check if this user is host via localStorage
      if (typeof window !== 'undefined') {
        const isHostStored = localStorage.getItem(`host_${resolvedParams.id}`) === 'true';
        setIsHost(isHostStored);
      }
    };
    unwrapParams();
  }, [params]);

  useEffect(() => {
    if (!database) return;
    const offsetRef = ref(database, ".info/serverTimeOffset");
    const unsubscribe = onValue(offsetRef, (snap) => {
      setServerTimeOffset(snap.val() || 0);
    });
    return () => unsubscribe();
  }, []);

  // Sync when videoId changes
  useEffect(() => {
      if (lastSyncData.current && lastSyncData.current.videoId === videoId) {
          handleRemoteUpdate(lastSyncData.current);
      }
  }, [videoId]);

  useEffect(() => {
    if (!roomId) return;

    // Validate config
    if (!database) {
        setStatus('Lỗi: Chưa cấu hình Firebase. Hãy kiểm tra file .env.local');
        return;
    }

    setStatus('Đang đồng bộ dữ liệu...');
    roomRef.current = ref(database, `rooms/${roomId}`);

    // Subscribe to changes
    const unsubscribe = onValue(roomRef.current, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            lastSyncData.current = data;
            handleRemoteUpdate(data);
            setStatus('Đã kết nối và đồng bộ.');
        } else {
            // Room doesn't exist yet
             if (isHost) {
                 // Initialize room if host
                 setStatus('Đang tạo phòng mới...');
                 set(roomRef.current, {
                     videoId: 'dQw4w9WgXcQ',
                     isPlaying: false,
                     timestamp: 0,
                     updatedAt: serverTimestamp()
                 });
             } else {
                 setStatus('Phòng chưa được tạo hoặc không có dữ liệu.');
             }
        }
    }, (error) => {
        console.error("Firebase Error:", error);
        setStatus(`Lỗi kết nối: ${error.message}`);
    });

    return () => unsubscribe();
  }, [roomId, isHost, serverTimeOffset]); // Re-run sync if offset changes

  // --- Sync Logic ---

  const handleRemoteUpdate = (data: RoomState) => {
      // 1. Update Video ID
      if (data.videoId && data.videoId !== videoId) {
          isRemoteUpdate.current = true;
          setVideoId(data.videoId);
          // Don't try to sync playback yet, wait for player to load new video
          return;
      }

      // 2. Sync Playback
      if (playerRef.current) {
          const playerState = playerRef.current.getPlayerState();

          // Calculate expected current time using server offset
          let expectedTime = data.timestamp;
          if (data.isPlaying && data.updatedAt) {
              const estimatedServerTime = Date.now() + serverTimeOffset;
              const diff = (estimatedServerTime - data.updatedAt) / 1000;
              if (diff > 0) {
                  expectedTime += diff;
              }
          }

          // Seek if drift is too large (> 1 sec)
          // Also check if we just loaded the video to avoid initial jumpiness
          const currentTime = playerRef.current.getCurrentTime();
          if (Math.abs(currentTime - expectedTime) > 1.5) {
             isRemoteUpdate.current = true;
             playerRef.current.seekTo(expectedTime, true);
          }

          // Play/Pause
          if (data.isPlaying && playerState !== 1) { // 1 = playing
              isRemoteUpdate.current = true;
              playerRef.current.playVideo();
          } else if (!data.isPlaying && playerState !== 2) { // 2 = paused
              isRemoteUpdate.current = true;
              playerRef.current.pauseVideo();
          }
      }

      // Reset remote flag after a short delay
      setTimeout(() => { isRemoteUpdate.current = false; }, 500);
  };

  // --- Host Actions ---

  const updateRoomState = (updates: Partial<RoomState>) => {
      if (!isHost || !roomRef.current) return;

      update(roomRef.current, {
          ...updates,
          updatedAt: serverTimestamp() // Always update timestamp on change to sync time
      });
  };

  const onPlayerStateChange = (event: any) => {
    if (isRemoteUpdate.current) return;
    if (!isHost) return;

    const currentTime = event.target.getCurrentTime();

    if (event.data === 1) { // Playing
        updateRoomState({
            isPlaying: true,
            timestamp: currentTime
        });
    } else if (event.data === 2) { // Paused
        updateRoomState({
            isPlaying: false,
            timestamp: currentTime
        });
    }
  };

  const loadVideo = () => {
    const id = extractVideoId(inputUrl);
    if (id) {
        if (isHost) {
            updateRoomState({
                videoId: id,
                isPlaying: true, // Auto play on new video
                timestamp: 0
            });
            setInputUrl('');
        }
    } else {
        alert('Link không hợp lệ');
    }
  };

  const extractVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const onPlayerReady = (event: any) => {
      playerRef.current = event.target;
      // Immediate sync attempt when player is ready
      if (lastSyncData.current) {
          handleRemoteUpdate(lastSyncData.current);
      }
  };

  // --- Render ---

  const opts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      controls: 1,
    },
  };

  // Custom resize handle component
  const ResizeHandle = () => (
    <PanelResizeHandle className="w-4 bg-gray-900 flex items-center justify-center cursor-col-resize group relative z-10 -ml-2 hover:ml-0 transition-all">
      <div className="w-1 h-12 bg-gray-700 group-hover:bg-blue-500 rounded-full transition-colors duration-200" />
    </PanelResizeHandle>
  );

  return (
    <div className="flex h-screen w-full bg-gray-950 text-white overflow-hidden">
        <PanelGroup direction="horizontal">
            {/* Music Panel */}
            <Panel defaultSize={75} minSize={30} className="bg-gray-900/50">
                <div className="h-full flex flex-col">
                    {/* Header */}
                    <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900 sticky top-0 z-20 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
                            <h1 className="text-xl font-bold tracking-tight text-white">
                                Phòng: <span className="text-blue-400 font-mono">{roomId}</span>
                            </h1>
                            {!process.env.NEXT_PUBLIC_FIREBASE_API_KEY && (
                                <span className="ml-4 flex items-center gap-1 text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded border border-red-900/50">
                                    <AlertTriangle size={12} /> Config Error
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="flex items-center gap-2 bg-gray-800 hover:bg-red-600/90 hover:text-white text-gray-300 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium border border-gray-700 hover:border-red-500"
                        >
                            <LogOut size={16} />
                            Rời Phòng
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col items-center">
                        <div className="w-full max-w-5xl space-y-6">

                            {/* Status Bar */}
                            <div className="flex items-center justify-between text-sm bg-gray-800/50 px-4 py-2 rounded-lg border border-gray-700/50">
                                <div className="flex items-center gap-2 text-gray-400">
                                    <Info size={16} />
                                    <span>Trạng thái: {status}</span>
                                </div>
                                {!isHost && (
                                    <div className="flex items-center gap-2 text-blue-400 bg-blue-900/20 px-3 py-1 rounded-full text-xs font-medium">
                                        <Info size={12} />
                                        Đang xem cùng Host
                                    </div>
                                )}
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

                            {/* Video Player */}
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                                <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-800">
                                    <YouTube
                                        videoId={videoId}
                                        opts={opts}
                                        onReady={onPlayerReady}
                                        onStateChange={onPlayerStateChange}
                                        className="absolute top-0 left-0 w-full h-full"
                                    />
                                </div>
                            </div>

                            {/* Host Controls */}
                            {isHost && (
                                <div className="bg-gray-800/40 p-1 rounded-xl border border-gray-700/50 flex items-center shadow-lg backdrop-blur-sm">
                                    <div className="pl-4 pr-3 text-gray-500">
                                        <LinkIcon size={20} />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Dán link YouTube tại đây..."
                                        value={inputUrl}
                                        onChange={(e) => setInputUrl(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && loadVideo()}
                                        className="flex-1 bg-transparent border-none text-white placeholder-gray-500 focus:outline-none focus:ring-0 py-3 text-sm"
                                    />
                                    <button
                                        onClick={loadVideo}
                                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 m-1 shadow-md hover:shadow-lg active:scale-95"
                                    >
                                        <Play size={16} fill="currentColor" />
                                        Phát
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Panel>

            <ResizeHandle />

            {/* Chat Panel */}
            <Panel defaultSize={25} minSize={20} className="bg-gray-900 border-l border-gray-800">
                <div className="h-full">
                    {roomId && <ChatPanel roomId={roomId} />}
                </div>
            </Panel>
        </PanelGroup>
    </div>
  );
}
