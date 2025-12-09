import { ref, onValue, set, update, serverTimestamp, push, get, DatabaseReference, off, DataSnapshot, onDisconnect } from "firebase/database";
import { database } from '@/lib/firebase';

// -- Types --

/**
 * Represents the state of the media player.
 */
export interface PlayerState {
    /** The ID of the currently playing video (e.g., YouTube video ID). */
    videoId: string;
    /** Whether the video is currently playing. */
    isPlaying: boolean;
    /** The current playback timestamp in seconds. */
    timestamp: number;
    /** The server timestamp when the state was last updated. */
    updatedAt: number;
    /** The title of the current video. */
    title?: string;
    /** The thumbnail URL of the current video. */
    thumbnail?: string;
    /** The ID of the user who added the video. */
    addedBy?: string;
}

/**
 * Represents an item in the history.
 */
export interface HistoryItem {
    /** The unique ID of the history item. */
    id: string;
    /** The YouTube video ID. */
    videoId: string;
    /** The title of the video. */
    title: string;
    /** The URL of the video thumbnail. */
    thumbnail: string;
    /** The ID of the user who added the video. */
    addedBy: string;
    /** The server timestamp when the video was finished/skipped. */
    playedAt: number;
}

/**
 * Metadata for a room.
 */
export interface RoomMetadata {
    /** The localStorage key or ID of the host who created the room. */
    hostId: string;
    /** The server timestamp when the room was created. */
    createdAt: number;
}

/**
 * Represents a participant in the room.
 */
export interface Participant {
    /** The display name of the participant. */
    name: string;
    /** Whether the participant is currently online. */
    online: boolean;
    /** The server timestamp of the participant's last activity. */
    lastActive: number;
}

/**
 * Global settings for the room, affecting visual appearance.
 */
export interface RoomSettings {
    /** The URL of the background image, or null if none is set. */
    bgImage: string | null;
    /** The blur intensity for the background image. */
    bgBlur: number;
    /** The opacity of the overlay on top of the background image. */
    bgOverlay: number;
}

/**
 * Represents an item in the playback queue.
 */
export interface QueueItem {
    /** The unique ID of the queue item. */
    id: string;
    /** The YouTube video ID. */
    videoId: string;
    /** The title of the video. */
    title: string;
    /** The URL of the video thumbnail. */
    thumbnail: string;
    /** The ID of the user who added the video. */
    addedBy: string;
    /** The server timestamp when the video was added. */
    addedAt: number;
}

// -- Service --

/**
 * Service object containing methods for interacting with the Firebase Realtime Database
 * for room-related operations.
 */
export const roomService = {
    // Refs - Return null if DB not init
    /**
     * Gets a Firebase DatabaseReference for a specific path.
     * @param path - The database path.
     * @returns The DatabaseReference, or null if the database is not initialized.
     */
    getRef: (path: string) => {
        if (!database) return null;
        return ref(database, path);
    },

    /**
     * Gets the reference to the player state for a specific room.
     * @param roomId - The unique room ID.
     * @returns The DatabaseReference for the player state, or null.
     */
    getPlayerRef: (roomId: string) => {
        if (!database) return null;
        return ref(database, `rooms/${roomId}/player`);
    },
    /**
     * Gets the reference to the queue for a specific room.
     * @param roomId - The unique room ID.
     * @returns The DatabaseReference for the queue, or null.
     */
    getQueueRef: (roomId: string) => {
        if (!database) return null;
        return ref(database, `rooms/${roomId}/queue`);
    },
    /**
     * Gets the reference to the history for a specific room.
     * @param roomId - The unique room ID.
     * @returns The DatabaseReference for the history, or null.
     */
    getHistoryRef: (roomId: string) => {
        if (!database) return null;
        return ref(database, `rooms/${roomId}/history`);
    },
    /**
     * Gets the reference to the messages for a specific room.
     * @param roomId - The unique room ID.
     * @returns The DatabaseReference for the messages, or null.
     */
    getMessagesRef: (roomId: string) => {
        if (!database) return null;
        return ref(database, `rooms/${roomId}/messages`);
    },
    /**
     * Gets the reference to the settings for a specific room.
     * @param roomId - The unique room ID.
     * @returns The DatabaseReference for the settings, or null.
     */
    getSettingsRef: (roomId: string) => {
        if (!database) return null;
        return ref(database, `rooms/${roomId}/settings`);
    },
    /**
     * Gets the reference to the metadata for a specific room.
     * @param roomId - The unique room ID.
     * @returns The DatabaseReference for the metadata, or null.
     */
    getMetaRef: (roomId: string) => {
        if (!database) return null;
        return ref(database, `rooms/${roomId}/meta`);
    },
    /**
     * Gets the reference to the participants list for a specific room.
     * @param roomId - The unique room ID.
     * @returns The DatabaseReference for the participants, or null.
     */
    getParticipantsRef: (roomId: string) => {
        if (!database) return null;
        return ref(database, `rooms/${roomId}/participants`);
    },
    /**
     * Gets the reference to the server time offset.
     * @returns The DatabaseReference for the server time offset, or null.
     */
    getServerTimeOffsetRef: () => {
        if (!database) return null;
        return ref(database, ".info/serverTimeOffset");
    },

    // Actions

    /**
     * Initializes a room with default player state if it doesn't already exist.
     * @param roomId - The unique room ID.
     * @param defaultVideoId - The default video ID to start with (defaults to 'dQw4w9WgXcQ').
     */
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

    /**
     * Updates the player state for a room.
     * @param roomId - The unique room ID.
     * @param updates - A partial object containing the fields to update (videoId, isPlaying, timestamp).
     * @returns A promise that resolves when the update is complete.
     */
    updatePlayerState: (roomId: string, updates: Partial<PlayerState>) => {
        if (!database) return;
        const playerRef = roomService.getPlayerRef(roomId);
        if (!playerRef) return;
        return update(playerRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });
    },

    /**
     * Sends a chat message to the room.
     * @param roomId - The unique room ID.
     * @param sender - The name or ID of the sender.
     * @param text - The content of the message.
     * @returns A promise that resolves when the message is sent.
     */
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

    /**
     * Updates the room settings (background, etc.).
     * @param roomId - The unique room ID.
     * @param settings - A partial object containing the settings to update.
     * @returns A promise that resolves when the settings are updated.
     */
    updateSettings: (roomId: string, settings: Partial<RoomSettings>) => {
        if (!database) return;
        const settingsRef = roomService.getSettingsRef(roomId);
        if (!settingsRef) return;
        return update(settingsRef, settings);
    },

    // Queue Logic
    /**
     * Adds an item to the playback queue.
     * @param roomId - The unique room ID.
     * @param item - The queue item to add (excluding the ID, which is generated).
     * @returns A promise that resolves when the item is added.
     */
    addToQueue: (roomId: string, item: Omit<QueueItem, 'id'>) => {
        if (!database) return;
        const queueRef = roomService.getQueueRef(roomId);
        if (!queueRef) return;
        return push(queueRef, item);
    },

    /**
     * Removes an item from the playback queue.
     * @param roomId - The unique room ID.
     * @param itemId - The ID of the item to remove.
     * @returns A promise that resolves when the item is removed.
     */
    removeFromQueue: (roomId: string, itemId: string) => {
        if (!database) return;
        const itemRef = ref(database, `rooms/${roomId}/queue/${itemId}`);
        return set(itemRef, null);
    },

    /**
     * Replaces the entire queue with a new list of items.
     * @param roomId - The unique room ID.
     * @param queue - The array of QueueItem objects to set.
     * @returns A promise that resolves when the queue is updated.
     */
    setQueue: (roomId: string, queue: QueueItem[]) => {
        if (!database) return;
        const queueRef = roomService.getQueueRef(roomId);
        if (!queueRef) return;
        // Convert array back to object or just set it.
        // Firebase handles arrays with integer keys, but here we want to replace the whole node.
        // If we want to support reordering, writing the whole object is easiest.
        // However, we need to be careful about the structure.
        // Best to write as an object where keys are IDs.
        // But for reordering, an array is easier to manage in UI, but Firebase prefers objects.
        // Let's assume we pass an array, and we write it as an object using the existing IDs or generating new ones?
        // Actually, if we just want to reorder, we can't easily use existing IDs if they are push IDs (timestamp based).
        // Strategy: Write the whole queue as a new object, or use a separate "order" field?
        // Simplest: Replace the whole queue node with the new list (keyed by their IDs).
        const updates: Record<string, any> = {};
        queue.forEach(item => {
            updates[item.id] = item;
        });
        return set(queueRef, updates);
    },

    /**
     * Adds an item to the history.
     * @param roomId - The unique room ID.
     * @param item - The history item to add (excluding ID).
     * @returns A promise that resolves when the item is added.
     */
    addToHistory: (roomId: string, item: Omit<HistoryItem, 'id'>) => {
        if (!database) return;
        const historyRef = roomService.getHistoryRef(roomId);
        if (!historyRef) return;
        return push(historyRef, item);
    },

    // Participant Logic
    /**
     * Registers a participant in the room and handles their online status.
     * Sets up an `onDisconnect` handler to mark the user as offline when they disconnect.
     * @param roomId - The unique room ID.
     * @param userId - The unique user ID.
     * @param name - The user's display name.
     */
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
    /**
     * Listens for changes to the player state.
     * @param roomId - The unique room ID.
     * @param callback - A function to call when the player state changes.
     * @returns A function to unsubscribe from the listener.
     */
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

    /**
     * Listens for changes to the server time offset.
     * @param callback - A function to call when the offset changes.
     * @returns A function to unsubscribe from the listener.
     */
    onServerTimeOffsetChange: (callback: (offset: number) => void) => {
        if (!database) return () => {};
        const offsetRef = roomService.getServerTimeOffsetRef();
        if (!offsetRef) return () => {};
        return onValue(offsetRef, (snap) => callback(snap.val() || 0));
    }
};
