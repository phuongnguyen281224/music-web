import { useState, useEffect, useRef, useCallback } from 'react';
import { roomService, PlayerState, QueueItem } from '@/lib/services/roomService';
import { onValue } from 'firebase/database';

export interface UseRoomResult {
    // State
    roomId: string;
    isHost: boolean;
    status: string;
    playerState: PlayerState;
    serverTimeOffset: number;
    queue: QueueItem[];

    // Actions
    updatePlayer: (updates: Partial<PlayerState>) => void;
    changeVideo: (url: string) => void;
    addToQueue: (url: string, addedBy: string) => Promise<boolean>;
    removeFromQueue: (itemId: string) => void;
    playNext: () => void;
    moveItem: (itemId: string, direction: 'up' | 'down') => void;

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
                // Convert object to array and sort?
                // Since we use push, keys are chronological.
                // But playNext/reorder might mess with that if we manually set keys.
                // Let's rely on client-side array from object entries for now,
                // but if we reorder, we overwrite.

                // Strategy: Just map entries to array.
                const list = Object.entries(data).map(([key, value]: [string, any]) => ({
                    id: key,
                    ...value
                }));
                // If we want to preserve order from a reorder, we might need an 'index' field.
                // But for now, let's assume the push keys order is fine OR the order they come back from Firebase.
                // Firebase returns keys in order if they are push IDs.
                // If we did a full replace with custom keys, order might be weird unless we handle it.
                // Simplest 'Sort' feature: Client-side logic for now.
                // Wait, if I use `setQueue`, I'm replacing the object.
                // If I use `push`, it appends.
                // The Reorder Logic in roomService uses `set(queueRef, updates)`.
                // If I just dump the array back as an object, the keys are still the original keys.
                // Firebase sorts by keys.
                // If I want to reorder, I MUST change the keys OR add an 'order' field.
                // Changing keys is hard (delete and add).
                // Adding 'order' field is robust.
                // Let's stick to a simpler approach:
                // Since this is a small personal app, `queue` will be an array on the client.
                // The `reorder` function will delete the old queue and write the new one as a list?
                // No, that's destructive.
                // Let's just trust that the user won't race-condition reorder too much.
                // AND since I implemented `setQueue` to take an array but write an object...
                // Wait, my `setQueue` implementation: `updates[item.id] = item`.
                // This preserves the keys. So the order in Firebase (sorted by key) WON'T change.
                // THIS IS A BUG in my mental model.
                // FIX: To reorder in Firebase without an 'order' field, you have to delete and re-add or use 'order' field.
                // OR, keep it simple: `queue` in Firebase is just a list of items.
                // BUT I implemented it as an object (via `push`).

                // REVISED STRATEGY for Reorder:
                // We will just use `setQueue` but we need to ensure the keys sort the way we want.
                // Actually, I can't easily change the sort order of existing keys.
                // So I will just add `addedAt` timestamp and sort by that? No, user wants to reorder manually.

                // OK, I will add an `order` field to `QueueItem` implicitly here?
                // No, let's just make the client sort by `order` if it exists, or `addedAt`.
                // For MVP: I will NOT implement complex reordering (drag and drop) that persists perfectly without an 'order' field.
                // I will implement "Move Up/Down" which essentially swaps the CONTENT of the nodes?
                // Or better: Just Delete and Re-Add everything? (Risky).

                // ALTERNATIVE: Use a simple numeric priority field `order` initialized to `Date.now()`.
                // When moving up, swap `order` values with the neighbor.
                // Yes. That's better.

                // Update: I'll accept the list as is from Firebase (sorted by key usually)
                // and if I really want to reorder, I might have to be creative.
                // Given the constraints, I will implement "Add to Queue" first.
                // "Sort" might be just client-side for the current user? No, must sync.
                // Let's try to swap the *values* of the two nodes in Firebase?
                // Yes, `moveItem` will swap the data at `id1` and `id2`.

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

        const updates: any = {};
        updates[`rooms/${id}/queue/${idA}`] = { ...dataB };
        updates[`rooms/${id}/queue/${idB}`] = { ...dataA };

        // Use root ref update to be atomic?
        // roomService doesn't expose root update directly but we can use `update(ref(db), updates)`
        // Ideally we add a method in roomService for this, but for now let's just do individual updates
        // or add a specific method.
        // Let's add `swapQueueItems` to roomService?
        // I can't edit roomService again without another tool call.
        // I'll just delete and re-add in the new order? No.

        // Hack: Just update both separately. Race condition possible but rare.
        // Actually, `roomService.getQueueRef` returns a ref.
        // I can import `update` and `ref` in this file? No, better to keep abstraction.
        // I will use `roomService.setQueue` but that writes the WHOLE queue.
        // If I modify the local `queue` array (swap items) and send it to `setQueue`:
        // My `setQueue` implementation: `updates[item.id] = item`.
        // If I swap the array order locally: `[B, A]`.
        // `setQueue` writes `updates[B.id] = B`, `updates[A.id] = A`.
        // The keys are still `A.id` and `B.id`.
        // Firebase sorts by key. So `A.id` comes before `B.id`.
        // So `A` (which is now `B`'s content? No).

        // Wait. `setQueue` takes `QueueItem[]`.
        // If I pass `[itemB, itemA]`.
        // `itemB` has `idB`. `itemA` has `idA`.
        // `updates[idB] = itemB`. `updates[idA] = itemA`.
        // Firebase sees: `idA: itemA`, `idB: itemB`.
        // Result: No change in order.

        // Conclusion: To reorder, I MUST swap the CONTENT between the keys.
        // So: `itemA` gets `dataB`, `itemB` gets `dataA`.
        // Then `setQueue` with modified items (ID kept, data swapped).

        const newItemA = { ...itemA, ...dataB, id: itemA.id }; // ID A, Content B
        const newItemB = { ...itemB, ...dataA, id: itemB.id }; // ID B, Content A

        const newQueue = [...queue];
        newQueue[index] = newItemA;
        newQueue[targetIndex] = newItemB;

        // We only need to update these two.
        // But `setQueue` updates all. It's fine for small lists.
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

// Helper
const extractVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};
