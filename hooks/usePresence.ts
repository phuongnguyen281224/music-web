import { useState, useEffect, useCallback } from 'react';
import { roomService, Participant } from '@/lib/services/roomService';
import { onValue, off } from 'firebase/database';

/**
 * Result object returned by the `usePresence` hook.
 */
export interface UsePresenceResult {
    /** The unique ID of the current user. */
    userId: string;
    /** The display name of the current user. */
    username: string;
    /** A record of participants currently in the room, keyed by user ID. */
    participants: Record<string, Participant>;
    /** Function to set the user's display name. */
    setUserName: (name: string) => void;
    /** Boolean indicating if the user has set their display name. */
    isNameSet: boolean;
}

/**
 * Generates a simple random ID string.
 *
 * @returns A random alphanumeric string.
 */
const generateUserId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

/**
 * Custom hook to manage user presence and participants in a room.
 * Handles user identity (ID and name) persistence and synchronization with Firebase.
 *
 * @param roomId - The ID of the room to track presence for.
 * @returns An object containing user identity, participant list, and methods to update identity.
 */
export function usePresence(roomId: string): UsePresenceResult {
    const [userId, setUserId] = useState<string>('');
    const [username, setUsername] = useState<string>('');
    const [participants, setParticipants] = useState<Record<string, Participant>>({});
    const [isNameSet, setIsNameSet] = useState(false);

    // Initialize Identity
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // Get or create User ID
            let storedId = localStorage.getItem('music_app_userid');
            if (!storedId) {
                storedId = generateUserId();
                localStorage.setItem('music_app_userid', storedId);
            }
            setUserId(storedId);

            // Get username
            const storedName = localStorage.getItem('chat_username');
            if (storedName) {
                setUsername(storedName);
                setIsNameSet(true);
            }
        }
    }, []);

    // Register Presence
    useEffect(() => {
        if (!roomId || !userId || !username) return;
        roomService.registerParticipant(roomId, userId, username);
    }, [roomId, userId, username]);


    // Listen for participants
    useEffect(() => {
        if (!roomId) return;

        const participantsRef = roomService.getParticipantsRef(roomId);
        if (!participantsRef) return; // Handle no DB

        const unsubscribe = onValue(participantsRef, (snapshot) => {
            if (snapshot.exists()) {
                setParticipants(snapshot.val());
            } else {
                setParticipants({});
            }
        });

        return () => unsubscribe();
    }, [roomId]);

    const handleSetUserName = useCallback((name: string) => {
        if (!name.trim()) return;
        setUsername(name.trim());
        setIsNameSet(true);
        if (typeof window !== 'undefined') {
            localStorage.setItem('chat_username', name.trim());
        }
    }, []);

    return {
        userId,
        username,
        participants,
        setUserName: handleSetUserName,
        isNameSet
    };
}
