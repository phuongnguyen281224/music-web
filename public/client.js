const socket = io();

// DOM Elements
const lobbyView = document.getElementById('lobby');
const roomView = document.getElementById('room');
const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const roomCodeInput = document.getElementById('roomCodeInput');
const displayRoomCode = document.getElementById('displayRoomCode');
const videoUrlInput = document.getElementById('videoUrlInput');
const loadVideoBtn = document.getElementById('loadVideoBtn');
const statusLog = document.getElementById('statusLog');
const leaveRoomBtn = document.getElementById('leaveRoomBtn');

let currentRoom = null;
let player;
let isRemoteUpdate = false; // Flag to prevent infinite loops

// --- Lobby Logic ---

createRoomBtn.addEventListener('click', () => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    joinRoom(roomCode);
});

joinRoomBtn.addEventListener('click', () => {
    const roomCode = roomCodeInput.value.trim().toUpperCase();
    if (roomCode) {
        joinRoom(roomCode);
    } else {
        alert('Vui lòng nhập mã phòng!');
    }
});

leaveRoomBtn.addEventListener('click', () => {
    location.reload();
});

function joinRoom(roomCode) {
    currentRoom = roomCode;
    socket.emit('join_room', roomCode);

    lobbyView.classList.add('hidden');
    roomView.classList.remove('hidden');
    displayRoomCode.textContent = roomCode;

    log(`Đã vào phòng: ${roomCode}`);
}

function log(msg) {
    const p = document.createElement('p');
    p.textContent = msg;
    statusLog.prepend(p);
}

// --- YouTube API ---

// Load IFrame Player API code asynchronously
var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '100%',
        width: '100%',
        videoId: 'dQw4w9WgXcQ', // Default video (Rick Roll)
        playerVars: {
            'playsinline': 1,
            'controls': 1 // Enable controls but we hook into events
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    log("Máy phát nhạc đã sẵn sàng.");
}

function onPlayerStateChange(event) {
    // If change was triggered remotely, ignore emitting event
    if (isRemoteUpdate) return;

    if (event.data == YT.PlayerState.PLAYING) {
        socket.emit('play_video', currentRoom);
    } else if (event.data == YT.PlayerState.PAUSED) {
        socket.emit('pause_video', currentRoom);
    }
}

// --- Player Controls & Socket Events ---

loadVideoBtn.addEventListener('click', () => {
    const url = videoUrlInput.value;
    const videoId = extractVideoId(url);
    if (videoId) {
        socket.emit('change_video', { roomCode: currentRoom, videoId: videoId });
        loadVideo(videoId);
    } else {
        alert('Link YouTube không hợp lệ!');
    }
});

function extractVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function loadVideo(videoId) {
    isRemoteUpdate = true;
    player.loadVideoById(videoId);
    videoUrlInput.value = '';
    // Reset flag after a short delay because loadVideo triggers state changes
    setTimeout(() => isRemoteUpdate = false, 1000);
    log(`Đang phát video mới: ${videoId}`);
}

// --- Socket Listeners ---

socket.on('change_video', (videoId) => {
    log(`Chủ phòng đổi bài: ${videoId}`);
    loadVideo(videoId);
});

socket.on('play_video', () => {
    if (player && player.getPlayerState() !== YT.PlayerState.PLAYING) {
        isRemoteUpdate = true;
        player.playVideo();
        log("Đang phát nhạc...");
        setTimeout(() => isRemoteUpdate = false, 500);
    }
});

socket.on('pause_video', () => {
    if (player && player.getPlayerState() !== YT.PlayerState.PAUSED) {
        isRemoteUpdate = true;
        player.pauseVideo();
        log("Đã tạm dừng.");
        setTimeout(() => isRemoteUpdate = false, 500);
    }
});

socket.on('user_joined', (userId) => {
    log(`Một người nghe mới đã vào phòng!`);
});

socket.on('request_sync', (requesterId) => {
    // Send my current state to the new user
    if (player && player.getPlayerState) {
        const currentState = {
            targetId: requesterId,
            videoId: player.getVideoData()['video_id'],
            currentTime: player.getCurrentTime(),
            isPlaying: player.getPlayerState() === YT.PlayerState.PLAYING
        };
        socket.emit('send_sync_data', currentState);
    }
});

socket.on('initial_sync', (data) => {
    log("Đồng bộ dữ liệu từ phòng...");
    isRemoteUpdate = true;
    player.loadVideoById(data.videoId, data.currentTime);
    if (!data.isPlaying) {
        player.pauseVideo();
    }
    setTimeout(() => isRemoteUpdate = false, 1000);
});

// Periodic sync (optional, simple seek sync)
// Every few seconds, if playing, check if we need to sync seek
// For this MVP, we rely on 'play' and 'change_video' mostly.
// Implementing exact seek sync can be jittery without advanced logic.
