import { useState, useEffect, useRef } from "react";
import socket from "../socket";
import useWebRTC from "../hooks/useWebRTC";
import VideoTile from "../components/VideoTile";
import Chat from "../components/Chat";
import ParticipantList from "../components/ParticipantList";

export default function Room({ roomId, userName, onLeave }) {
  const {
    localStream,
    peers,
    audioEnabled,
    videoEnabled,
    mediaError,
    isOwner,
    toggleAudio,
    toggleVideo,
    leaveCall,
    kickPeer,
  } = useWebRTC(roomId, userName);

  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [copied, setCopied] = useState(false);
  const [messages, setMessages] = useState([]);
  const unreadRef = useRef(0);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    socket.on("you-were-kicked", () => {
      onLeave();
    });
    return () => socket.off("you-were-kicked");
  }, [onLeave]);

  useEffect(() => {
    socket.on("chat-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
      if (!showChat) {
        unreadRef.current += 1;
        setUnread(unreadRef.current);
      }
    });
    return () => socket.off("chat-message");
  }, [showChat]);

  const handleLeave = () => {
    leaveCall();
    onLeave();
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalParticipants = 1 + peers.length;
  const gridClass =
    totalParticipants === 1
      ? "grid-1"
      : totalParticipants === 2
      ? "grid-2"
      : totalParticipants <= 4
      ? "grid-4"
      : "grid-many";

  return (
    <div className="room-page">
      {/* Top bar */}
      <div className="room-topbar">
        <div className="room-info">
          <span className="room-label">Room</span>
          <span className="room-code">{roomId}</span>
          <button className="copy-btn" onClick={copyRoomId} title="Copy room code">
            {copied ? "✓ Copied" : "⎘ Copy"}
          </button>
        </div>
        <div className="participant-count">
          👥 {totalParticipants} participant{totalParticipants !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Media error banner */}
      {mediaError && (
        <div className="media-error-banner">
          ⚠️ {mediaError} — others may not see/hear you.
        </div>
      )}

      {/* Video grid + chat layout */}
      <div className={`room-body ${showChat || showParticipants ? "with-chat" : ""}`}>
        <div className={`video-grid ${gridClass}`}>
          {/* Local tile */}
          <VideoTile
            stream={localStream}
            userName={userName}
            muted
            audioEnabled={audioEnabled}
            videoEnabled={videoEnabled}
            isLocal
          />

          {/* Remote tiles */}
          {peers.map((peer) => (
            <VideoTile
              key={peer.socketId}
              stream={peer.stream}
              userName={peer.userName}
              audioEnabled={peer.audioEnabled !== false}
              videoEnabled={peer.videoEnabled !== false}
              isOwner={isOwner}
              onKick={() => kickPeer(peer.socketId)}
            />
          ))}
        </div>

        {showParticipants && (
          <ParticipantList
            userName={userName}
            peers={peers}
            isOwner={isOwner}
            onKick={kickPeer}
            onClose={() => setShowParticipants(false)}
          />
        )}

        {showChat && (
          <Chat
            roomId={roomId}
            userName={userName}
            messages={messages}
            onClose={() => {
              setShowChat(false);
              unreadRef.current = 0;
              setUnread(0);
            }}
          />
        )}
      </div>

      {/* Control bar */}
      <div className="control-bar">
        <button
          className={`ctrl-btn ${!audioEnabled ? "ctrl-off" : ""}`}
          onClick={toggleAudio}
          title={audioEnabled ? "Mute" : "Unmute"}
        >
          <span className="ctrl-icon">{audioEnabled ? "🎙️" : "🔇"}</span>
          <span className="ctrl-label">{audioEnabled ? "Mute" : "Unmute"}</span>
        </button>

        <button
          className={`ctrl-btn ${!videoEnabled ? "ctrl-off" : ""}`}
          onClick={toggleVideo}
          title={videoEnabled ? "Stop video" : "Start video"}
        >
          <span className="ctrl-icon">{videoEnabled ? "📷" : "📷"}</span>
          <span className="ctrl-label">{videoEnabled ? "Stop Video" : "Start Video"}</span>
        </button>

        <button
          className={`ctrl-btn ${showParticipants ? "ctrl-active" : ""}`}
          onClick={() => { setShowParticipants((v) => !v); setShowChat(false); }}
          title="Participants"
        >
          <span className="ctrl-icon">👥</span>
          <span className="ctrl-label">People</span>
        </button>

        <button
          className={`ctrl-btn ${showChat ? "ctrl-active" : ""}`}
          onClick={() => {
            setShowChat((v) => !v);
            setShowParticipants(false);
            unreadRef.current = 0;
            setUnread(0);
          }}
          title="Chat"
        >
          <span className="ctrl-icon">💬{unread > 0 && !showChat ? ` (${unread})` : ""}</span>
          <span className="ctrl-label">Chat</span>
        </button>

        <button className="ctrl-btn ctrl-leave" onClick={handleLeave} title="Leave">
          <span className="ctrl-icon">📞</span>
          <span className="ctrl-label">Leave</span>
        </button>
      </div>
    </div>
  );
}
