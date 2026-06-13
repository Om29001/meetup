import { useState } from "react";
import Home from "./pages/Home";
import Room from "./pages/Room";
import "./App.css";

export default function App() {
  const [session, setSession] = useState(null); // { roomId, userName }

  const handleJoin = (roomId, userName) => {
    setSession({ roomId, userName });
  };

  const handleLeave = () => {
    setSession(null);
  };

  if (!session) {
    return <Home onJoin={handleJoin} />;
  }

  return (
    <Room
      roomId={session.roomId}
      userName={session.userName}
      onLeave={handleLeave}
    />
  );
}
