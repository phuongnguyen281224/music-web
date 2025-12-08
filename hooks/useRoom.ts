import { useState, useEffect, useRef, useCallback } from 'react';
import { roomService, PlayerState, QueueItem } from '@/lib/services/roomService';
import { onValue } from 'firebase/database';

/**
 * Result object returned by the `useRoom` hook.
 */
export interface UseRoomResult {
    // State
    /** The unique room ID. */
    roomId: string;
    /** Boolean indicating if the current user is the host. */
    isHost: boolean;
    /** The current connection status string. */
    status: string;
    /** The current state of the media player. */
    playerState: PlayerState;
    /** The calculated offset between client and server time. */
    serverTimeOffset: number;
    /** The list of items in the playback queue. */
    queue: QueueItem[];

    // Actions
    /**
     * Updates the player state.
     * @param updates - Partial player state to update.
     */
    updatePlayer: (updates: Partial<PlayerState>) => void;
    /**
     * Changes the current video.
     * @param url - The YouTube URL or ID.
     */
    changeVideo: (url: string) => void;
    /**
     * Adds a video to the queue.
     * @param url - The YouTube URL.
     * @param addedBy - The user ID adding the video.
     * @returns A promise resolving to true if successful, false otherwise.
     */
    addToQueue: (url: string, addedBy: string) => Promise<boolean>;
    /**
     * Removes an item from the queue.
     * @param itemId - The unique ID of the queue item.
     */
    removeFromQueue: (itemId: string) => void;
    /**
     * Plays the next video in the queue and removes it.
     */
    playNext: () => void;
    /**
     * Moves a queue item up or down.
     * @param itemId - The unique ID of the item to move.
     * @param direction - 'up' or 'down'.
     */
    moveItem: (itemId: string, direction: 'up' | 'down') => void;

    // Utils
    /** Ref indicating if the current update is from a remote source. */
    isRemoteUpdate: React.MutableRefObject<boolean>;
}

const DEFAULT_PLAYER_STATE: PlayerState = {
    videoId: 'dQw4w9WgXcQ',
    isPlaying: false,
    timestamp: 0,
    updatedAt: 0
};

/**
 * Custom hook to manage room logic, including player state, queue, and host status.
 *
 * @param roomId - The potential room ID string.
 * @param paramsId - The route parameters which might contain the room ID (Next.js quirk handling).
 * @returns The `UseRoomResult` object containing state and actions.
 */
export function useRoom(roomId: string, paramsId: Promise<{ id: string }> | string | { id: string } | any): UseRoomResult {
    const [id, setId] = useState<string>('');
    const [isHost, setIsHost] = useState<boolean>(false);
    const [status, setStatus] = useState<string>('Đang kết nối...');
    const [playerState, setPlayerState] = useState<PlayerState>(DEFAULT_PLAYER_STATE);
    const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);
    const [queue, setQueue] = useState<QueueItem[]>([]);

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

    // Subscribe to Queue
    useEffect(() => {
        if (!id) return;
        const queueRef = roomService.getQueueRef(id);
        if (!queueRef) return;

        const unsub = onValue(queueRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Strategy: Just map entries to array.
                const list = Object.entries(data).map(([key, value]: [string, any]) => ({
                    id: key,
                    ...value
                }));
                setQueue(list);
            } else {
                setQueue([]);
            }
        });
        return () => unsub();
    }, [id]);

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

    const addToQueue = useCallback(async (url: string, addedBy: string) => {
        const videoId = extractVideoId(url);
        if (!videoId) return false;

        // Fetch Metadata
        let title = 'Video chưa xác định';
        let thumbnail = '';
        try {
            const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
            const data = await res.json();
            if (data.title) title = data.title;
            if (data.thumbnail_url) thumbnail = data.thumbnail_url;
        } catch (e) {
            console.error("Failed to fetch metadata", e);
        }

        const item: any = {
            videoId,
            title,
            thumbnail,
            addedBy,
            addedAt: Date.now()
        };

        await roomService.addToQueue(id, item);
        return true;
    }, [id]);

    const removeFromQueue = useCallback((itemId: string) => {
        roomService.removeFromQueue(id, itemId);
    }, [id]);

    const playNext = useCallback(() => {
        if (queue.length === 0) return;
        const nextItem = queue[0]; // Assuming queue is sorted

        updatePlayer({
            videoId: nextItem.videoId,
            isPlaying: true,
            timestamp: 0
        });

        removeFromQueue(nextItem.id);
    }, [id, queue, updatePlayer, removeFromQueue]);

    const moveItem = useCallback((itemId: string, direction: 'up' | 'down') => {
        const index = queue.findIndex(i => i.id === itemId);
        if (index === -1) return;

        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= queue.length) return;

        const itemA = queue[index];
        const itemB = queue[targetIndex];

        // Swap data in Firebase (keep IDs, swap content)
        // This effectively reorders them because keys remain sorted, but content moves.
        // We need to swap everything EXCEPT the ID.
        const { id: idA, ...dataA } = itemA;
        const { id: idB, ...dataB } = itemB;

        // Note: This works because we are swapping content between two stable IDs.
        const newItemA = { ...itemA, ...dataB, id: itemA.id }; // ID A, Content B
        const newItemB = { ...itemB, ...dataA, id: itemB.id }; // ID B, Content A

        const newQueue = [...queue];
        newQueue[index] = newItemA;
        newQueue[targetIndex] = newItemB;

        roomService.setQueue(id, newQueue);

    }, [id, queue]);

    return {
        roomId: id,
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
        isRemoteUpdate
    };
}

/**
 * Helper function to extract the YouTube video ID from a URL.
 *
 * @param url - The YouTube URL.
 * @returns The video ID string or null if not found.
 */
const extractVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};
