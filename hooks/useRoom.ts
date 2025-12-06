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

// paramsId can be string, Promise<{id}>, or just {id} object depending on Next.js version quirks
export function useRoom(roomId: string, paramsId: Promise<{ id: string }> | string | { id: string } | any) {
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
                if (typeof paramsId === 'string') {
                    finalId = paramsId;
                } else if (paramsId instanceof Promise) {
                     const resolved = await paramsId;
                     finalId = resolved.id;
                } else if (typeof paramsId === 'object' && paramsId !== null && 'id' in paramsId) {
                    // Handle case where params is already resolved object
                    finalId = (paramsId as { id: string }).id;
                } else {
                    console.warn("Unknown paramsId format:", paramsId);
                }
            }

            if (finalId && typeof finalId === 'string') {
                setId(finalId);
                // Check host status
                if (typeof window !== 'undefined') {
                    const isHostStored = localStorage.getItem(`host_${finalId}`) === 'true';
                    setIsHost(isHostStored);
                }
            } else if (finalId) {
                console.error("Failed to extract string ID from params:", finalId);
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
        if (!id) return;
        roomService.updatePlayerState(id, updates);
    }, [id]);

    const changeVideo = useCallback((url: string) => {
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
    }, [updatePlayer]);

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
