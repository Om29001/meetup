const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// rooms: { roomId: { owner: socketId, users: [{ socketId, userName }] } }
const rooms = {};

// REST: create a room
app.post("/api/rooms", (req, res) => {
  const roomId = uuidv4().slice(0, 8).toUpperCase();
  rooms[roomId] = { users: [] };
  res.json({ roomId });
});

// REST: check if room exists
app.get("/api/rooms/:roomId", (req, res) => {
  const { roomId } = req.params;
  if (rooms[roomId]) {
    res.json({ exists: true, userCount: rooms[roomId].users.length });
  } else {
    res.status(404).json({ exists: false });
  }
});

io.on("connection", (socket) => {
  console.log(`[+] Socket connected: ${socket.id}`);

  // ── JOIN ROOM ──────────────────────────────────────────────
  socket.on("join-room", ({ roomId, userName }) => {
    if (!rooms[roomId]) {
      rooms[roomId] = { users: [] };
    }

    const room = rooms[roomId];

    // First joiner becomes owner
    if (!room.owner) room.owner = socket.id;

    room.users.push({ socketId: socket.id, userName });
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.userName = userName;

    console.log(`[~] ${userName} joined room ${roomId}`);

    // Tell the newcomer who's already in the room + who is owner
    const others = room.users.filter((u) => u.socketId !== socket.id);
    socket.emit("room-users", { users: others, owner: room.owner });

    // Tell everyone else a new user arrived
    socket.to(roomId).emit("user-joined", {
      socketId: socket.id,
      userName,
    });
  });

  // ── WebRTC SIGNALING ───────────────────────────────────────
  // Offer
  socket.on("offer", ({ to, offer }) => {
    io.to(to).emit("offer", {
      from: socket.id,
      fromName: socket.data.userName,
      offer,
    });
  });

  // Answer
  socket.on("answer", ({ to, answer }) => {
    io.to(to).emit("answer", {
      from: socket.id,
      answer,
    });
  });

  // ICE Candidate
  socket.on("ice-candidate", ({ to, candidate }) => {
    io.to(to).emit("ice-candidate", {
      from: socket.id,
      candidate,
    });
  });

  // ── KICK PEER ──────────────────────────────────────────────
  socket.on("kick-peer", ({ roomId, targetSocketId }) => {
    const room = rooms[roomId];
    if (!room || room.owner !== socket.id) return; // only owner can kick
    io.to(targetSocketId).emit("you-were-kicked");
  });

  // ── CHAT ───────────────────────────────────────────────────
  socket.on("chat-message", ({ roomId, message }) => {
    io.to(roomId).emit("chat-message", {
      from: socket.id,
      userName: socket.data.userName,
      message,
      time: new Date().toISOString(),
    });
  });

  // ── MEDIA STATE ────────────────────────────────────────────
  socket.on("media-state", ({ roomId, audio, video }) => {
    socket.to(roomId).emit("media-state", {
      from: socket.id,
      audio,
      video,
    });
  });

  // ── DISCONNECT ─────────────────────────────────────────────
  socket.on("disconnect", () => {
    const { roomId, userName } = socket.data;
    if (roomId && rooms[roomId]) {
      const room = rooms[roomId];
      const wasOwner = room.owner === socket.id;

      room.users = room.users.filter((u) => u.socketId !== socket.id);

      if (room.users.length === 0) {
        delete rooms[roomId];
        console.log(`[x] Room ${roomId} deleted (empty)`);
      } else if (wasOwner) {
        // Transfer ownership to next user
        room.owner = room.users[0].socketId;
        io.to(roomId).emit("owner-changed", { newOwner: room.owner });
      }

      socket.to(roomId).emit("user-left", { socketId: socket.id, userName });
    }
    console.log(`[-] Socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Signaling server running on http://localhost:${PORT}`);
});
