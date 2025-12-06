import { ref, onValue, set, update, serverTimestamp, push, get, DatabaseReference, off, DataSnapshot } from "firebase/database";
import { database } from '@/lib/firebase';

// -- Types --

export interface PlayerState {
    videoId: string;
    isPlaying: boolean;
    timestamp: number;
    updatedAt: number;
}

export interface RoomMetadata {
    hostId: string; // The localStorage key or ID of the host
    createdAt: number;
}

// -- Service --

export const roomService = {
    // Refs
    getRef: (path: string) => {
        if (!database) throw new Error("Database not initialized");
        return ref(database, path);
    },

    getPlayerRef: (roomId: string) => ref(database!, `rooms/${roomId}/player`),
    getMessagesRef: (roomId: string) => ref(database!, `rooms/${roomId}/messages`),
    getMetaRef: (roomId: string) => ref(database!, `rooms/${roomId}/meta`),
    getServerTimeOffsetRef: () => ref(database!, ".info/serverTimeOffset"),

    // Actions

    // Initialize a room with default state
    initializeRoom: async (roomId: string, defaultVideoId: string = 'dQw4w9WgXcQ') => {
        if (!database) return;
        const playerRef = roomService.getPlayerRef(roomId);

        // Check if exists first to avoid overwriting
        const snapshot = await get(playerRef);
        if (!snapshot.exists()) {
             await set(playerRef, {
                videoId: defaultVideoId,
                isPlaying: false,
                timestamp: 0,
                updatedAt: serverTimestamp()
            });
        }
    },

    // Update player state (Host only)
    updatePlayerState: (roomId: string, updates: Partial<PlayerState>) => {
        if (!database) return;
        const playerRef = roomService.getPlayerRef(roomId);
        return update(playerRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });
    },

    // Send a message
    sendMessage: (roomId: string, sender: string, text: string) => {
        if (!database) return;
        const messagesRef = roomService.getMessagesRef(roomId);
        return push(messagesRef, {
            sender,
            text,
            timestamp: serverTimestamp()
        });
    },

    // Listeners (returning unsubscribe function)
    onPlayerStateChange: (roomId: string, callback: (data: PlayerState | null) => void) => {
        if (!database) return () => {};
        const playerRef = roomService.getPlayerRef(roomId);

        const listener = (snapshot: DataSnapshot) => {
            callback(snapshot.val());
        };

        const unsubscribe = onValue(playerRef, listener);
        return unsubscribe; // Return the unsubscribe function directly
    },

    onServerTimeOffsetChange: (callback: (offset: number) => void) => {
        if (!database) return () => {};
        const offsetRef = roomService.getServerTimeOffsetRef();
        return onValue(offsetRef, (snap) => callback(snap.val() || 0));
    }
};
