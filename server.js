const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Store room state in memory (simple approach for MVP)
// format: { roomCode: { currentVideoId: '...', isPlaying: false, currentTime: 0, lastUpdate: timestamp } }
// Note: Keeping state on server is reliable, but for precise sync, we often rely on clients.
// We will use a hybrid: Server relays, clients sync.
const rooms = {};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join_room', (roomCode) => {
        socket.join(roomCode);
        console.log(`User ${socket.id} joined room: ${roomCode}`);

        // Notify others
        socket.to(roomCode).emit('user_joined', socket.id);

        // If room exists, tell the new user the current state
        // In a p2p-like sync, we ask an existing user to send the state,
        // or if we store it on server, we send it directly.
        // Let's ask the first client in the room to sync (if any exist)
        const clients = io.sockets.adapter.rooms.get(roomCode);
        if (clients && clients.size > 1) {
            // Find another client in the room to ask for sync
            const iterator = clients.values();
            let otherSocketId = iterator.next().value;
            if (otherSocketId === socket.id) {
                otherSocketId = iterator.next().value;
            }

            if (otherSocketId) {
                io.to(otherSocketId).emit('request_sync', socket.id);
            }
        }
    });

    socket.on('change_video', ({ roomCode, videoId }) => {
        console.log(`Room ${roomCode} changed video to ${videoId}`);
        io.to(roomCode).emit('change_video', videoId);
    });

    socket.on('play_video', (roomCode) => {
        socket.to(roomCode).emit('play_video');
    });

    socket.on('pause_video', (roomCode) => {
        socket.to(roomCode).emit('pause_video');
    });

    socket.on('sync_time', ({ roomCode, time }) => {
        // Broadcast seek/time sync to others
        socket.to(roomCode).emit('sync_time', time);
    });

    socket.on('send_sync_data', ({ targetId, videoId, currentTime, isPlaying }) => {
        io.to(targetId).emit('initial_sync', { videoId, currentTime, isPlaying });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
