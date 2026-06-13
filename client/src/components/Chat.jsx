import { useState, useEffect, useRef } from "react";
import socket from "../socket";

export default function Chat({ roomId, userName, messages, onClose }) {
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    if (!text.trim()) return;
    socket.emit("chat-message", { roomId, message: text.trim() });
    setText("");
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <span>In-call Messages</span>
        <button className="chat-close" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="chat-empty">Messages are visible to everyone in the call</p>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.userName === userName;
          return (
            <div key={i} className={`chat-msg ${isMe ? "mine" : "theirs"}`}>
              {!isMe && <div className="chat-sender">{msg.userName}</div>}
              <div className="chat-bubble">{msg.message}</div>
              <div className="chat-time">{formatTime(msg.time)}</div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <textarea
          className="chat-input"
          placeholder="Send a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          rows={2}
        />
        <button className="chat-send" onClick={send} disabled={!text.trim()}>
          ➤
        </button>
      </div>
    </div>
  );
}
