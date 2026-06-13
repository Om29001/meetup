import { useEffect, useRef, useCallback, useState } from "react"
import socket from "../socket"

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
}

export default function useWebRTC(roomId, userName) {
  const localStreamRef = useRef(null)
  const peerConnections = useRef({}) // { socketId: RTCPeerConnection }
  const [peers, setPeers] = useState([]) // [{ socketId, userName, stream }]
  const [localStream, setLocalStream] = useState(null)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [mediaError, setMediaError] = useState(null)
  const [isOwner, setIsOwner] = useState(false)

  // ── helpers ────────────────────────────────────────────────
  const updatePeer = useCallback((socketId, data) => {
    setPeers(prev => {
      const exists = prev.find(p => p.socketId === socketId)
      if (exists) {
        return prev.map(p => (p.socketId === socketId ? { ...p, ...data } : p))
      }
      return [...prev, { socketId, ...data }]
    })
  }, [])

  const removePeer = useCallback(socketId => {
    if (peerConnections.current[socketId]) {
      peerConnections.current[socketId].close()
      delete peerConnections.current[socketId]
    }
    setPeers(prev => prev.filter(p => p.socketId !== socketId))
  }, [])

  // ── create RTCPeerConnection ───────────────────────────────
  const createPC = useCallback(
    (remoteSocketId, remoteUserName) => {
      const pc = new RTCPeerConnection(ICE_SERVERS)
      peerConnections.current[remoteSocketId] = pc

      // Add local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current)
        })
      }

      // ICE candidates
      pc.onicecandidate = e => {
        if (e.candidate) {
          socket.emit("ice-candidate", {
            to: remoteSocketId,
            candidate: e.candidate,
          })
        }
      }

      // Remote stream
      pc.ontrack = e => {
        updatePeer(remoteSocketId, {
          userName: remoteUserName,
          stream: e.streams[0],
        })
      }

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "disconnected"
        ) {
          removePeer(remoteSocketId)
        }
      }

      return pc
    },
    [updatePeer, removePeer],
  )

  // ── init local media & socket ──────────────────────────────
  useEffect(() => {
    let mounted = true

    async function init() {
      try {
        console.log(navigator)
        console.log(navigator.mediaDevices)
        console.log(window.isSecureContext)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })
        if (!mounted) return
        localStreamRef.current = stream
        setLocalStream(stream)

        socket.connect()
        socket.emit("join-room", { roomId, userName })
      } catch (err) {
        console.error("Media error:", err)
        setMediaError(err.message)
        // Try audio only fallback
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          })
          if (!mounted) return
          localStreamRef.current = audioStream
          setLocalStream(audioStream)
          setVideoEnabled(false)
          socket.connect()
          socket.emit("join-room", { roomId, userName })
        } catch (audioErr) {
          setMediaError("Could not access camera or microphone.")
        }
      }
    }

    init()

    return () => {
      mounted = false
    }
  }, []) // eslint-disable-line

  // ── leaveCall (defined early so socket handlers can reference it) ─────────
  const leaveCall = useCallback(() => {
    Object.values(peerConnections.current).forEach(pc => pc.close())
    peerConnections.current = {}
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop())
    }
    socket.disconnect()
    setPeers([])
    setLocalStream(null)
  }, [])

  const kickPeer = useCallback((targetSocketId) => {
    socket.emit("kick-peer", { roomId, targetSocketId })
  }, [roomId])

  // ── Socket event handlers ──────────────────────────────────
  useEffect(() => {
    // Users already in room when we join
    socket.on("room-users", async ({ users, owner }) => {
      if (owner === socket.id) setIsOwner(true)
      for (const user of users) {
        const pc = createPC(user.socketId, user.userName)
        updatePeer(user.socketId, { userName: user.userName, stream: null })
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        socket.emit("offer", { to: user.socketId, offer })
      }
    })

    // New user joins after us
    socket.on("user-joined", ({ socketId, userName: uName }) => {
      createPC(socketId, uName)
      updatePeer(socketId, { userName: uName, stream: null })
    })

    // Receive offer
    socket.on("offer", async ({ from, fromName, offer }) => {
      let pc = peerConnections.current[from]
      if (!pc) {
        pc = createPC(from, fromName)
        updatePeer(from, { userName: fromName, stream: null })
      }
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      socket.emit("answer", { to: from, answer })
    })

    // Receive answer
    socket.on("answer", async ({ from, answer }) => {
      const pc = peerConnections.current[from]
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer))
      }
    })

    // ICE candidate
    socket.on("ice-candidate", async ({ from, candidate }) => {
      const pc = peerConnections.current[from]
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (e) {
          console.warn("ICE error:", e)
        }
      }
    })

    // User left
    socket.on("user-left", ({ socketId }) => {
      removePeer(socketId)
    })

    socket.on("you-were-kicked", () => {
      leaveCall()
    })

    socket.on("owner-changed", ({ newOwner }) => {
      if (newOwner === socket.id) setIsOwner(true)
    })

    // Peer mute/camera state
    socket.on("media-state", ({ from, audio, video }) => {
      setPeers(prev =>
        prev.map(p =>
          p.socketId === from
            ? { ...p, audioEnabled: audio, videoEnabled: video }
            : p,
        ),
      )
    })

    return () => {
      socket.off("room-users")
      socket.off("user-joined")
      socket.off("offer")
      socket.off("answer")
      socket.off("ice-candidate")
      socket.off("user-left")
      socket.off("media-state")
      socket.off("you-were-kicked")
      socket.off("owner-changed")
    }
  }, [createPC, updatePeer, removePeer, leaveCall])

  // ── Controls ───────────────────────────────────────────────

  const toggleAudio = useCallback(() => {
    if (!localStreamRef.current) return
    const track = localStreamRef.current.getAudioTracks()[0]
    if (track) {
      track.enabled = !track.enabled
      setAudioEnabled(track.enabled)
      socket.emit("media-state", {
        roomId,
        audio: track.enabled,
        video: videoEnabled,
      })
    }
  }, [roomId, videoEnabled])

  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return
    const track = localStreamRef.current.getVideoTracks()[0]
    if (track) {
      track.enabled = !track.enabled
      setVideoEnabled(track.enabled)
      socket.emit("media-state", {
        roomId,
        audio: audioEnabled,
        video: track.enabled,
      })
    }
  }, [roomId, audioEnabled])

  return {
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
  }
}
