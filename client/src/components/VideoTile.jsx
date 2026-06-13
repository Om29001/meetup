import { useEffect, useRef } from "react";

export default function VideoTile({
  stream,
  userName,
  muted = false,
  audioEnabled = true,
  videoEnabled = true,
  isLocal = false,
  isOwner = false,
  onKick,
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoEnabled]);

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  return (
    <div className={`video-tile ${!videoEnabled ? "no-video" : ""}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className="video-el"
        style={{ display: videoEnabled && stream ? "block" : "none" }}
      />
      {(!videoEnabled || !stream) && (
        <div className="avatar-fallback">
          <span className="avatar-initials">{initials}</span>
        </div>
      )}
      <div className="tile-label">
        <span className="tile-name">
          {userName}
          {isLocal ? " (You)" : ""}
        </span>
        <div className="tile-icons">
          {!audioEnabled && (
            <span className="tile-icon muted" title="Muted">🔇</span>
          )}
          {!videoEnabled && (
            <span className="tile-icon no-cam" title="Camera off">📷</span>
          )}
          {isOwner && !isLocal && onKick && (
            <button className="kick-btn" onClick={onKick} title="Remove participant">
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
