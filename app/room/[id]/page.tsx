'use client';

import { useEffect, useState, useRef } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import type { Peer, DataConnection } from 'peerjs';

interface RoomProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ host?: string }>;
}

export default function Room({ params, searchParams }: RoomProps) {
  // Unwrap params and searchParams using React.use() or await in async component
  // Since this is a client component, we use useEffect/useState for async unwrapping or assume passed props
  // However, in Next.js 15, params are promises.
  // We need to handle this properly.

  const [roomId, setRoomId] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('Đang khởi tạo...');
  const [videoId, setVideoId] = useState<string>('dQw4w9WgXcQ'); // Default
  const [inputUrl, setInputUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

  // PeerJS refs
  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<DataConnection[]>([]);
  const playerRef = useRef<any>(null); // YouTube Player instance
  const isRemoteUpdate = useRef(false); // Prevent infinite loops

  useEffect(() => {
    // Unwrapping params (Next.js 13+ pattern)
    const unwrapParams = async () => {
      const resolvedParams = await params;
      const resolvedSearchParams = await searchParams;

      setRoomId(resolvedParams.id);
      setIsHost(resolvedSearchParams?.host === 'true');
    };
    unwrapParams();
  }, [params, searchParams]);

  useEffect(() => {
    if (!roomId) return;

    const initPeer = async () => {
      // Dynamic import PeerJS because it uses navigator which is client-side only
      const { default: Peer } = await import('peerjs');

      // Clean up old peer if exists
      if (peerRef.current) peerRef.current.destroy();

      let peer: Peer;

      if (isHost) {
        // Host uses the Room ID as their Peer ID
        peer = new Peer(roomId, {
            debug: 2
        });
      } else {
        // Guest uses a random ID
        peer = new Peer();
      }

      peer.on('open', (id) => {
        setStatus(isHost ? `Đang chờ người vào... (ID: ${id})` : `Đã kết nối máy chủ peer. ID của bạn: ${id}`);

        if (!isHost) {
          connectToHost(peer, roomId);
        }
      });

      peer.on('connection', (conn) => {
        if (isHost) {
          handleIncomingConnection(conn);
        } else {
          // Guests shouldn't really get connections in this simple model,
          // unless we do mesh, but strictly Star topology here.
          conn.on('data', (data) => handleData(data));
        }
      });

      peer.on('error', (err) => {
        console.error(err);
        setStatus(`Lỗi: ${err.type}`);
        if (err.type === 'peer-unavailable') {
            setStatus('Không tìm thấy phòng này. Có thể chủ phòng đã thoát.');
        } else if (err.type === 'unavailable-id') {
            setStatus('Mã phòng này đã có người sử dụng (hoặc bạn đang mở tab trùng).');
        }
      });

      peerRef.current = peer;
    };

    initPeer();

    return () => {
      peerRef.current?.destroy();
    };
  }, [roomId, isHost]);

  // --- Host Logic ---

  const handleIncomingConnection = (conn: DataConnection) => {
    setStatus(`Có người mới vào!`);
    connectionsRef.current.push(conn);

    conn.on('open', () => {
      // Send current state to new guest
      const currentState = {
        type: 'SYNC',
        videoId: videoId,
        isPlaying: isPlaying,
        time: playerRef.current ? playerRef.current.getCurrentTime() : 0
      };
      conn.send(currentState);
    });

    conn.on('close', () => {
      connectionsRef.current = connectionsRef.current.filter(c => c !== conn);
    });
  };

  const broadcast = (data: any) => {
    if (!isHost) return;
    connectionsRef.current.forEach(conn => {
      if (conn.open) conn.send(data);
    });
  };

  // --- Guest Logic ---

  const connectToHost = (peer: Peer, hostId: string) => {
    setStatus(`Đang kết nối vào phòng ${hostId}...`);
    const conn = peer.connect(hostId);

    conn.on('open', () => {
      setStatus(`Đã vào phòng thành công!`);
    });

    conn.on('data', (data) => handleData(data));

    conn.on('close', () => {
        setStatus('Mất kết nối với chủ phòng.');
    });
  };

  // --- Common Logic ---

  const handleData = (data: any) => {
    console.log('Received data:', data);
    if (data.type === 'VIDEO_CHANGE') {
        isRemoteUpdate.current = true;
        setVideoId(data.videoId);
        // Reset flag after a bit? No, waiting for player ready/load
    }
    else if (data.type === 'PLAY') {
        if (playerRef.current) {
            isRemoteUpdate.current = true;
            playerRef.current.playVideo();
        }
    }
    else if (data.type === 'PAUSE') {
        if (playerRef.current) {
            isRemoteUpdate.current = true;
            playerRef.current.pauseVideo();
        }
    }
    else if (data.type === 'SYNC') {
        isRemoteUpdate.current = true;
        setVideoId(data.videoId); // Might trigger reload
        // Wait for player to handle the video ID change, then seek
        setTimeout(() => {
             if (playerRef.current) {
                playerRef.current.seekTo(data.time);
                if (data.isPlaying) playerRef.current.playVideo();
                else playerRef.current.pauseVideo();
             }
        }, 1000);
    }
  };

  // --- Player Event Handlers ---

  const onPlayerReady = (event: any) => {
    playerRef.current = event.target;
  };

  const onPlayerStateChange = (event: any) => {
    // If Play (1) or Pause (2)
    // If this change was caused by code (remote update), ignore broadcast
    if (isRemoteUpdate.current) {
        // Reset flag
        if (event.data === 1 || event.data === 2) {
            setTimeout(() => { isRemoteUpdate.current = false; }, 500);
        }
        return;
    }

    if (!isHost) return; // Only host controls for now to keep it simple

    if (event.data === 1) { // Playing
        broadcast({ type: 'PLAY' });
        setIsPlaying(true);
    } else if (event.data === 2) { // Paused
        broadcast({ type: 'PAUSE' });
        setIsPlaying(false);
    }
  };

  const loadVideo = () => {
    const id = extractVideoId(inputUrl);
    if (id) {
        setVideoId(id);
        setInputUrl('');
        if (isHost) {
            broadcast({ type: 'VIDEO_CHANGE', videoId: id });
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

  // --- Render ---

  const opts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      controls: 1, // Let users use controls, we hook events
    },
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-900 text-white p-4">
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Phòng: {roomId}</h1>
            <button
                onClick={() => window.location.href = '/'}
                className="bg-red-600 px-4 py-2 rounded hover:bg-red-700"
            >
                Rời Phòng
            </button>
        </div>

        <div className="text-sm text-gray-400 mb-2 text-center">{status}</div>

        {!isHost && (
            <div className="bg-yellow-900/50 p-2 mb-4 text-center text-yellow-200 text-sm rounded">
                ⚠️ Bạn là khách. Chỉ chủ phòng mới có quyền đổi bài và chỉnh nhạc.
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
            <div className="flex gap-2">
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
  );
}
