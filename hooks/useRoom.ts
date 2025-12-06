import { useState, useEffect, useRef, useCallback } from 'react';
import { roomService, PlayerState } from '@/lib/services/roomService';

export interface UseRoomResult {
    // State
    roomId: string;
    isHost: boolean;
    status: string;
    playerState: PlayerState;
    serverTimeOffset: number;

    // Actions
    updatePlayer: (updates: Partial<PlayerState>) => void;
    changeVideo: (url: string) => void;

    // Utils
    isRemoteUpdate: React.MutableRefObject<boolean>;
}

const DEFAULT_PLAYER_STATE: PlayerState = {
    videoId: 'dQw4w9WgXcQ',
    isPlaying: false,
    timestamp: 0,
    updatedAt: 0
};

export function useRoom(roomId: string, paramsId: Promise<{ id: string }> | string) {
    const [id, setId] = useState<string>('');
    const [isHost, setIsHost] = useState<boolean>(false);
    const [status, setStatus] = useState<string>('Đang kết nối...');
    const [playerState, setPlayerState] = useState<PlayerState>(DEFAULT_PLAYER_STATE);
    const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);

    const isRemoteUpdate = useRef(false);

    // Initialize Room ID and Host status
    useEffect(() => {
        const init = async () => {
            let finalId = roomId;
            if (!finalId && paramsId) {
                if (paramsId instanceof Promise) {
                     const resolved = await paramsId;
                     finalId = resolved.id;
                } else {
                    finalId = paramsId as string;
                }
            }

            if (finalId) {
                setId(finalId);
                // Check host status
                if (typeof window !== 'undefined') {
                    const isHostStored = localStorage.getItem(`host_${finalId}`) === 'true';
                    setIsHost(isHostStored);
                }
            }
        };
        init();
    }, [roomId, paramsId]);

    // Sync Server Time
    useEffect(() => {
        const unsub = roomService.onServerTimeOffsetChange((offset) => {
            setServerTimeOffset(offset);
        });
        return () => unsub();
    }, []);

    // Subscribe to Player State
    useEffect(() => {
        if (!id) return;

        setStatus('Đang đồng bộ...');

        // Try to init room (idempotent)
        if (isHost) {
            roomService.initializeRoom(id).catch(err => console.error(err));
        }

        const unsub = roomService.onPlayerStateChange(id, (data) => {
            if (data) {
                setPlayerState(data);
                setStatus('Đã kết nối.');
            } else {
                 if (isHost) {
                     setStatus('Đang khởi tạo...');
                 } else {
                     setStatus('Chờ Host tạo phòng...');
                 }
            }
        });

        return () => unsub();
    }, [id, isHost]);

    // Actions
    const updatePlayer = useCallback((updates: Partial<PlayerState>) => {
        if (!isHost || !id) return;
        roomService.updatePlayerState(id, updates);
    }, [isHost, id]);

    const changeVideo = useCallback((url: string) => {
        if (!isHost) return;
        const videoId = extractVideoId(url);
        if (videoId) {
            updatePlayer({
                videoId,
                isPlaying: true,
                timestamp: 0
            });
            return true;
        }
        return false;
    }, [isHost, updatePlayer]);

    return {
        roomId: id,
        isHost,
        status,
        playerState,
        serverTimeOffset,
        updatePlayer,
        changeVideo,
        isRemoteUpdate
    };
}

// Helper
const extractVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};
