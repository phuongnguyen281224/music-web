'use client';

import { useEffect, useState, useRef } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import { ref, onValue, set, update, serverTimestamp, push, child, get } from "firebase/database";
import { database } from '@/lib/firebase';
import {
} from "react-resizable-panels";
import ChatPanel from '@/app/components/ChatPanel';
// NOTE: I will create the resizable wrapper components in a separate file or inline if needed,
// but based on `react-resizable-panels` docs, they are direct imports.
// However, to keep it clean, I will import directly from the library here.
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";


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
    <PanelResizeHandle className="w-2 bg-gray-700 hover:bg-blue-500 transition-colors flex items-center justify-center cursor-col-resize">
      <div className="h-8 w-1 bg-gray-500 rounded-full" />
    </PanelResizeHandle>
  );

  return (
    <div className="flex h-screen w-full bg-gray-900 text-white overflow-hidden">
        <PanelGroup direction="horizontal">
            {/* Music Panel */}
            <Panel defaultSize={75} minSize={30}>
                <div className="h-full flex flex-col items-center overflow-y-auto p-4">
                    <div className="w-full max-w-5xl">
                        <div className="flex justify-between items-center mb-6">
                            <h1 className="text-2xl font-bold truncate">Phòng: {roomId}</h1>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="bg-red-600 px-4 py-2 rounded hover:bg-red-700 whitespace-nowrap ml-4"
                            >
                                Rời Phòng
                            </button>
                        </div>

                        <div className="text-sm text-gray-400 mb-2 text-center">{status}</div>

                        {!process.env.NEXT_PUBLIC_FIREBASE_API_KEY && (
                            <div className="bg-red-900/50 p-4 mb-4 text-center text-red-200 rounded border border-red-500">
                                ⚠️ Cảnh báo: Chưa cấu hình Firebase Key. Vui lòng tạo file <code>.env.local</code> và điền thông tin.
                            </div>
                        )}

                        {!isHost && (
                            <div className="bg-blue-900/50 p-2 mb-4 text-center text-blue-200 text-sm rounded">
                                ℹ️ Bạn đang xem cùng Host.
                            </div>
                        )}

                        <div className="aspect-video bg-black w-full rounded-xl overflow-hidden shadow-2xl mb-6 relative">
                            <YouTube
                                videoId={videoId}
                                opts={opts}
                                onReady={onPlayerReady}
                                onStateChange={onPlayerStateChange}
                                className="absolute top-0 left-0 w-full h-full"
                            />
                        </div>

                        {isHost && (
                            <div className="flex gap-2 mb-10">
                                <input
                                    type="text"
                                    placeholder="Dán link YouTube..."
                                    value={inputUrl}
                                    onChange={(e) => setInputUrl(e.target.value)}
                                    className="flex-1 p-3 rounded bg-gray-800 border border-gray-700 text-white"
                                />
                                <button
                                    onClick={loadVideo}
                                    className="bg-green-600 px-6 py-3 rounded font-bold hover:bg-green-700"
                                >
                                    Phát
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </Panel>

            <ResizeHandle />

            {/* Chat Panel */}
            <Panel defaultSize={25} minSize={20}>
                <div className="h-full">
                    {roomId && <ChatPanel roomId={roomId} />}
                </div>
            </Panel>
        </PanelGroup>
    </div>
  );
}
