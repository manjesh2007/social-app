import { useState, useRef, useCallback, useEffect } from 'react';
import { RNWebRTC, isWebRTCAvailable, RTCViewComp } from './webrtcLib';

export { isWebRTCAvailable, RTCViewComp };

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';
const WS_BASE = BACKEND_URL.replace(/^http/, 'ws') + '/api/live/ws/';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

const DEMO_MATCH_DELAY = 6500; // fall back to a demo peer if no real match (single-device preview)

export type LiveState = 'idle' | 'searching' | 'connected' | 'ended';

export interface PeerUser {
  id: string;
  name: string;
  avatar?: string;
  city?: string;
  age?: number;
  interests?: string[];
}

export interface LiveChatMsg {
  id: string;
  sender: string;
  text: string;
  mine: boolean;
  system?: boolean;
}

const SAMPLE_PEERS: PeerUser[] = [
  { id: 'usr_priya_002', name: 'Priya Sharma', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800', city: 'Pune', age: 24, interests: ['Design', 'Coffee', 'Music'] },
  { id: 'usr_sam_003', name: 'Sam Taylor', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800', city: 'Bangalore', age: 22, interests: ['Coding', 'Gaming', 'Fitness'] },
  { id: 'usr_rohit_004', name: 'Rohit Verma', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800', city: 'Mumbai', age: 25, interests: ['Cinema', 'Street Food', 'Art'] },
  { id: 'usr_maya_005', name: 'Maya Patel', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800', city: 'Mumbai', age: 23, interests: ['Dance', 'Travel', 'Photography'] },
];

const DEMO_REPLIES = [
  'Hey! Nice to meet you on Nearby Friends 😄',
  'Where are you connecting from?',
  'Love this Live Connect feature, so smooth!',
  'What are you into? I\'m big on music & travel 🎧',
  'Haha this is fun, hi there 👋',
];

interface UseLiveConnectArgs {
  userId?: string;
  userName?: string;
  interests?: string[];
}

export function useLiveConnect({ userId, userName, interests }: UseLiveConnectArgs) {
  const [state, setState] = useState<LiveState>('idle');
  const [peer, setPeer] = useState<PeerUser | null>(null);
  const [chat, setChat] = useState<LiveChatMsg[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFront, setIsFront] = useState(true);
  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<any>(null);
  const localStreamRef = useRef<any>(null);
  const sessionIdRef = useRef<string | null>(null);
  const peerIdRef = useRef<string | null>(null);
  const isInitiatorRef = useRef<boolean>(false);
  const demoTimerRef = useRef<any>(null);
  const demoIdxRef = useRef<number>(0);
  const mountedRef = useRef<boolean>(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanupCall();
      closeSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearDemoTimer = () => {
    if (demoTimerRef.current) {
      clearTimeout(demoTimerRef.current);
      demoTimerRef.current = null;
    }
  };

  const closeSocket = () => {
    if (wsRef.current) {
      try { wsRef.current.close(); } catch (e) {}
      wsRef.current = null;
    }
  };

  const cleanupCall = () => {
    clearDemoTimer();
    if (pcRef.current) {
      try { pcRef.current.close(); } catch (e) {}
      pcRef.current = null;
    }
    setRemoteStream(null);
    sessionIdRef.current = null;
    peerIdRef.current = null;
    isInitiatorRef.current = false;
  };

  const stopLocalStream = () => {
    if (localStreamRef.current) {
      try { localStreamRef.current.getTracks().forEach((t: any) => t.stop()); } catch (e) {}
      localStreamRef.current = null;
      setLocalStream(null);
    }
  };

  const getLocalStream = async () => {
    if (!isWebRTCAvailable) return null;
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const stream = await RNWebRTC.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: 'user', width: 640, height: 480, frameRate: 30 },
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setPermissionError(null);
      return stream;
    } catch (e: any) {
      setPermissionError(e?.message || 'Camera / microphone permission denied');
      return null;
    }
  };

  const sendWs = (obj: any) => {
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify(obj));
    }
  };

  const sendSignal = (signalType: string, data: any) => {
    sendWs({
      type: 'signal',
      session_id: sessionIdRef.current,
      target_user_id: peerIdRef.current,
      signal_type: signalType,
      data,
    });
  };

  const buildPeerConnection = (stream: any) => {
    const pc = new RNWebRTC.RTCPeerConnection(ICE_SERVERS);
    if (stream) {
      stream.getTracks().forEach((track: any) => pc.addTrack(track, stream));
    }
    pc.addEventListener('icecandidate', (event: any) => {
      if (event.candidate) sendSignal('ice-candidate', event.candidate);
    });
    pc.addEventListener('track', (event: any) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    });
    // legacy fallback
    pc.addEventListener('addstream', (event: any) => {
      if (event.stream) setRemoteStream(event.stream);
    });
    return pc;
  };

  const startRealCall = async (matchedPeer: PeerUser, sessionId: string, initiator: boolean) => {
    if (!isWebRTCAvailable) return;
    const stream = await getLocalStream();
    const pc = buildPeerConnection(stream);
    pcRef.current = pc;
    if (initiator) {
      try {
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await pc.setLocalDescription(offer);
        sendSignal('offer', offer);
      } catch (e) {}
    }
  };

  const handleSignal = async (msg: any) => {
    const pc = pcRef.current;
    if (!pc || !isWebRTCAvailable) return;
    try {
      if (msg.signal_type === 'offer') {
        await pc.setRemoteDescription(new RNWebRTC.RTCSessionDescription(msg.data));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal('answer', answer);
      } else if (msg.signal_type === 'answer') {
        await pc.setRemoteDescription(new RNWebRTC.RTCSessionDescription(msg.data));
      } else if (msg.signal_type === 'ice-candidate') {
        await pc.addIceCandidate(new RNWebRTC.RTCIceCandidate(msg.data));
      }
    } catch (e) {}
  };

  const scheduleDemoReply = () => {
    setTimeout(() => {
      if (!mountedRef.current || state === 'idle') return;
      const reply = DEMO_REPLIES[Math.floor(Math.random() * DEMO_REPLIES.length)];
      setChat((prev) => [...prev, { id: `dm_${Date.now()}`, sender: peer?.name || 'Guest', text: reply, mine: false }]);
    }, 1800);
  };

  const connectToDemoPeer = useCallback(() => {
    clearDemoTimer();
    const p = SAMPLE_PEERS[demoIdxRef.current % SAMPLE_PEERS.length];
    demoIdxRef.current += 1;
    setIsDemo(true);
    setPeer(p);
    sessionIdRef.current = `demo_${Date.now()}`;
    peerIdRef.current = p.id;
    setRemoteStream(null);
    setState('connected');
    setChat([{ id: 'sys_demo', sender: 'System', text: `Connected with ${p.name} from ${p.city}! Say hello 👋`, mine: false, system: true }]);
  }, []);

  const handleMatch = useCallback((matchedPeer: PeerUser, sessionId: string, initiator: boolean) => {
    clearDemoTimer();
    setIsDemo(false);
    setPeer(matchedPeer);
    sessionIdRef.current = sessionId;
    peerIdRef.current = matchedPeer.id;
    isInitiatorRef.current = initiator;
    setState('connected');
    setChat([{ id: 'sys_1', sender: 'System', text: `Connected with ${matchedPeer.name}! Say hello 👋`, mine: false, system: true }]);
    startRealCall(matchedPeer, sessionId, initiator);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openSocket = useCallback(() => {
    return new Promise<void>((resolve) => {
      if (!userId) { resolve(); return; }
      if (wsRef.current && wsRef.current.readyState === 1) { resolve(); return; }
      try {
        const ws = new WebSocket(WS_BASE + userId);
        wsRef.current = ws;
        ws.onopen = () => resolve();
        ws.onmessage = (ev: any) => {
          let msg: any;
          try { msg = JSON.parse(ev.data); } catch (e) { return; }
          if (msg.status === 'matched' || msg.type === 'match_found') {
            if (msg.peer) handleMatch(msg.peer, msg.session_id, !!msg.is_initiator);
          } else if (msg.type === 'webrtc_signal') {
            handleSignal(msg);
          } else if (msg.type === 'peer_disconnected') {
            handlePeerLeft();
          } else if (msg.type === 'live_chat_message') {
            setChat((prev) => [...prev, { id: `pm_${Date.now()}`, sender: peer?.name || 'Guest', text: msg.text, mine: false }]);
          }
        };
        ws.onerror = () => resolve();
        ws.onclose = () => { wsRef.current = null; };
        // Safety: resolve even if onopen is slow
        setTimeout(() => resolve(), 1500);
      } catch (e) {
        resolve();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, handleMatch]);

  const handlePeerLeft = useCallback(() => {
    cleanupCall();
    // auto re-queue for next match, omegle-style
    setState('searching');
    setPeer(null);
    setChat([]);
    beginSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const beginSearch = useCallback(async () => {
    clearDemoTimer();
    await openSocket();
    sendWs({ type: 'join_queue', preferences: { interests: interests || [], gender_preference: 'Any' } });
    demoTimerRef.current = setTimeout(() => {
      if (mountedRef.current) connectToDemoPeer();
    }, DEMO_MATCH_DELAY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSocket, interests, connectToDemoPeer]);

  const start = useCallback(async () => {
    setState('searching');
    setPeer(null);
    setChat([]);
    setRemoteStream(null);
    await getLocalStream(); // prompt cam/mic up-front (no-op on web/Expo Go)
    beginSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beginSearch]);

  const next = useCallback(() => {
    cleanupCall();
    if (isDemo) {
      setState('searching');
      setPeer(null);
      setChat([]);
      setTimeout(() => { if (mountedRef.current) connectToDemoPeer(); }, 1200);
      return;
    }
    setState('searching');
    setPeer(null);
    setChat([]);
    sendWs({ type: 'next_match', preferences: { interests: interests || [], gender_preference: 'Any' } });
    demoTimerRef.current = setTimeout(() => {
      if (mountedRef.current) connectToDemoPeer();
    }, DEMO_MATCH_DELAY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo, interests, connectToDemoPeer]);

  const stop = useCallback(() => {
    sendWs({ type: 'leave_queue' });
    cleanupCall();
    stopLocalStream();
    closeSocket();
    setState('idle');
    setPeer(null);
    setChat([]);
    setIsDemo(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMic = useCallback(() => {
    setIsMuted((prev) => {
      const nextVal = !prev;
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((t: any) => { t.enabled = !nextVal; });
      }
      return nextVal;
    });
  }, []);

  const toggleVideo = useCallback(() => {
    setIsVideoOff((prev) => {
      const nextVal = !prev;
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((t: any) => { t.enabled = !nextVal; });
      }
      return nextVal;
    });
  }, []);

  const flipCamera = useCallback(() => {
    setIsFront((prev) => !prev);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t: any) => {
        if (typeof t._switchCamera === 'function') t._switchCamera();
      });
    }
  }, []);

  const sendChat = useCallback((text: string) => {
    const clean = text.trim();
    if (!clean) return;
    setChat((prev) => [...prev, { id: `me_${Date.now()}`, sender: userName || 'You', text: clean, mine: true }]);
    if (isDemo) {
      scheduleDemoReply();
    } else {
      sendWs({ type: 'chat_message', session_id: sessionIdRef.current, text: clean });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo, userName, peer]);

  return {
    state,
    peer,
    chat,
    isMuted,
    isVideoOff,
    isFront,
    localStream,
    remoteStream,
    permissionError,
    isDemo,
    isWebRTCAvailable,
    RTCViewComp,
    start,
    next,
    stop,
    toggleMic,
    toggleVideo,
    flipCamera,
    sendChat,
  };
}
