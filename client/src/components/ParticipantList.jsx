export default function ParticipantList({ userName, peers, isOwner, onKick, onClose }) {
  const all = [
    { socketId: "local", userName, isLocal: true, audioEnabled: true, videoEnabled: true },
    ...peers,
  ];

  return (
    <div className="participant-panel">
      <div className="participant-header">
        <span>Participants ({all.length})</span>
        <button className="chat-close" onClick={onClose}>✕</button>
      </div>
      <ul className="participant-list">
        {all.map((p) => (
          <li key={p.socketId} className="participant-item">
            <span className="p-avatar">
              {p.userName?.[0]?.toUpperCase() ?? "?"}
            </span>
            <span className="p-name">
              {p.userName}
              {p.isLocal && <span className="p-you"> (You)</span>}
            </span>
            <span className="p-icons">
              {p.audioEnabled === false && <span title="Muted">🔇</span>}
              {p.videoEnabled === false && <span title="Cam off">📷</span>}
              {isOwner && !p.isLocal && (
                <button className="kick-btn kick-btn-list" onClick={() => onKick(p.socketId)} title="Remove">✕</button>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
