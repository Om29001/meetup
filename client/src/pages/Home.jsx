import { useState } from "react";

export default function Home({ onJoin }) {
  const [userName, setUserName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const createRoom = async () => {
    if (!userName.trim()) {
      setError("Please enter your name");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/rooms", { method: "POST" });
      const data = await res.json();
      onJoin(data.roomId, userName.trim());
    } catch {
      setError("Failed to create room. Is the server running?");
    } finally {
      setCreating(false);
    }
  };

  const joinRoom = async () => {
    if (!userName.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!roomId.trim()) {
      setError("Please enter a room code");
      return;
    }
    setError("");
    try {
      const res = await fetch(`/api/rooms/${roomId.trim().toUpperCase()}`);
      if (!res.ok) {
        setError("Room not found. Check the code and try again.");
        return;
      }
      onJoin(roomId.trim().toUpperCase(), userName.trim());
    } catch {
      setError("Failed to join room. Is the server running?");
    }
  };

  return (
  <div className="home-page">
      <div className="home-card">
        <div className="home-logo">
          <span className="logo-icon">📹</span>
          <h1 className="logo-text">MeetUp</h1>
        </div>
        <p className="home-subtitle">HD video calls, right in your browser</p>

        <div className="form-group">
          <label className="form-label">Your Name</label>
          <input
            className="form-input"
            placeholder="Enter your display name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createRoom()}
            maxLength={30}
          />
        </div>

        <button
          className="btn btn-primary btn-full"
          onClick={createRoom}
          disabled={creating}
        >
          {creating ? "Creating…" : "✦ New Meeting"}
        </button>

        <div className="divider">
          <span>or join existing</span>
        </div>

        <div className="join-row">
          <input
            className="form-input join-input"
            placeholder="Room code (e.g. A1B2C3D4)"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && joinRoom()}
            maxLength={8}
          />
          <button className="btn btn-secondary" onClick={joinRoom}>
            Join
          </button>
        </div>

        {error && <p className="form-error">{error}</p>}
      </div>
    </div>
  );
}
