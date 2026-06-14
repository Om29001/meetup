# 📹 MeetUp — WebRTC Video Call App

A full-featured Zoom/Google Meet clone built with the MERN stack and native WebRTC.

## Features

- 🎥 HD video + audio calls (multi-participant)
- 🔇 Mute / 📷 Camera toggle with live status shown to others
- 💬 In-call chat panel
- 🔗 Shareable room codes
- 🌐 Works on any modern browser (Chrome, Edge, Firefox)
- ⚡ Pure WebRTC — no paid media server needed for LAN/localhost

---

## Tech Stack

| Layer     | Tech                                  |
|-----------|---------------------------------------|
| Frontend  | React 18, CSS (no UI lib)             |
| Signaling | Node.js + Express + Socket.io         |
| WebRTC    | Native browser RTCPeerConnection      |
| STUN      | Google public STUN servers            |

---

## Quick Start

### 1. Install dependencies

```bash
# Install all at once (from project root)
npm install          # installs concurrently
npm run install:all  # installs server + client deps

# Or manually:
cd server && npm install
cd ../client && npm install
```

### 2. Run in development

```bash
# From project root — starts both server (port 5000) and client (port 3000)
npm run dev
```

Or separately:
```bash
# Terminal 1 — server
cd server && npm run dev

# Terminal 2 — client
cd client && npm start
```

### 3. Open the app

Visit **http://localhost:3000**

- Click **"New Meeting"** to create a room
- Share the **8-character room code** with others
- Others go to the same URL, enter their name + code, click **"Join"**

---

## Project Structure

```
meetup-videocall/
├── server/
│   ├── index.js          ← Express + Socket.io signaling server
│   └── package.json
├── client/
│   ├── public/index.html
│   └── src/
│       ├── App.js        ← Root router (Home ↔ Room)
│       ├── App.css       ← All styles
│       ├── socket.js     ← Socket.io singleton
│       ├── hooks/
│       │   └── useWebRTC.js  ← All WebRTC logic
│       ├── components/
│       │   ├── VideoTile.js  ← Individual video tile
│       │   └── Chat.js       ← Chat panel
│       └── pages/
│           ├── Home.js   ← Lobby / create or join
│           └── Room.js   ← The call UI
└── package.json          ← Root scripts
```

---

## How WebRTC Signaling Works

```
User A joins            User B joins
     │                       │
     ├── join-room ──────────┤
     │                       │
     ├── room-users ◄────────┤   (server tells A about B)
     │                       │
     ├── createOffer ────────►│
     │                       │
     │◄─── answer ───────────┤
     │                       │
     ├──────── ICE candidates (both ways) ─────────┤
     │                       │
     └── P2P video/audio stream established ────────┘
```

---

