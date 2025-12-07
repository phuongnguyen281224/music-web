import { ref, onValue, set, update, serverTimestamp, push, get, DatabaseReference, off, DataSnapshot, onDisconnect } from "firebase/database";
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

export interface Participant {
    name: string;
    online: boolean;
    lastActive: number;
}

export interface RoomSettings {
    bgImage: string | null;
    bgBlur: number;
    bgOverlay: number;
}

// -- Service --

export const roomService = {
    // Refs - Return null if DB not init
    getRef: (path: string) => {
        if (!database) return null;
        return ref(database, path);
    },

    getPlayerRef: (roomId: string) => {
        if (!database) return null;
        return ref(database, `rooms/${roomId}/player`);
    },
    getMessagesRef: (roomId: string) => {
        if (!database) return null;
        return ref(database, `rooms/${roomId}/messages`);
    },
    getSettingsRef: (roomId: string) => {
        if (!database) return null;
        return ref(database, `rooms/${roomId}/settings`);
    },
    getMetaRef: (roomId: string) => {
        if (!database) return null;
        return ref(database, `rooms/${roomId}/meta`);
    },
    getParticipantsRef: (roomId: string) => {
        if (!database) return null;
        return ref(database, `rooms/${roomId}/participants`);
    },
    getServerTimeOffsetRef: () => {
        if (!database) return null;
        return ref(database, ".info/serverTimeOffset");
    },

    // Actions

    // Initialize a room with default state
    initializeRoom: async (roomId: string, defaultVideoId: string = 'dQw4w9WgXcQ') => {
        if (!database) return;
        const playerRef = roomService.getPlayerRef(roomId);
        if (!playerRef) return;

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
        if (!playerRef) return;
        return update(playerRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });
    },

    // Send a message
    sendMessage: (roomId: string, sender: string, text: string) => {
        if (!database) return;
        const messagesRef = roomService.getMessagesRef(roomId);
        if (!messagesRef) return;
        return push(messagesRef, {
            sender,
            text,
            timestamp: serverTimestamp()
        });
    },

    // Update settings
    updateSettings: (roomId: string, settings: Partial<RoomSettings>) => {
        if (!database) return;
        const settingsRef = roomService.getSettingsRef(roomId);
        if (!settingsRef) return;
        return update(settingsRef, settings);
    },

    // Participant Logic
    registerParticipant: (roomId: string, userId: string, name: string) => {
        if (!database) return;
        const userRef = ref(database, `rooms/${roomId}/participants/${userId}`);

        // Set online status
        set(userRef, {
            name,
            online: true,
            lastActive: serverTimestamp()
        });

        // Set offline on disconnect
        onDisconnect(userRef).update({
            online: false,
            lastActive: serverTimestamp()
        });
    },

    // Listeners (returning unsubscribe function)
    onPlayerStateChange: (roomId: string, callback: (data: PlayerState | null) => void) => {
        if (!database) return () => {};
        const playerRef = roomService.getPlayerRef(roomId);
        if (!playerRef) return () => {};

        const listener = (snapshot: DataSnapshot) => {
            callback(snapshot.val());
        };

        const unsubscribe = onValue(playerRef, listener);
        return unsubscribe; // Return the unsubscribe function directly
    },

    onServerTimeOffsetChange: (callback: (offset: number) => void) => {
        if (!database) return () => {};
        const offsetRef = roomService.getServerTimeOffsetRef();
        if (!offsetRef) return () => {};
        return onValue(offsetRef, (snap) => callback(snap.val() || 0));
    }
};
