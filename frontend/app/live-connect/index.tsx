import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '@/src/theme';
import { api } from '@/src/api/client';
import { useAuth } from '@/src/context/AuthContext';
import { router } from 'expo-router';
import { ReportModal } from '@/src/components/ReportModal';

type MatchState = 'idle' | 'searching' | 'connected' | 'ended';

interface PeerUser {
  id: string;
  name: string;
  avatar?: string;
  city?: string;
  age?: number;
  interests?: string[];
}

const SAMPLE_PEERS: PeerUser[] = [
  {
    id: 'usr_priya_002',
    name: 'Priya Sharma',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800',
    city: 'Pune',
    age: 24,
    interests: ['Design', 'Coffee', 'Music'],
  },
  {
    id: 'usr_sam_003',
    name: 'Sam Taylor',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800',
    city: 'Bangalore',
    age: 22,
    interests: ['Coding', 'Gaming', 'Fitness'],
  },
  {
    id: 'usr_rohit_004',
    name: 'Rohit Verma',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
    city: 'Mumbai',
    age: 25,
    interests: ['Cinema', 'Street Food', 'Art'],
  },
  {
    id: 'usr_maya_005',
    name: 'Maya Patel',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800',
    city: 'Mumbai',
    age: 23,
    interests: ['Dance', 'Travel', 'Photography'],
  },
];

export default function LiveConnectScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [matchState, setMatchState] = useState<MatchState>('idle');
  const [currentPeer, setCurrentPeer] = useState<PeerUser | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isVideoOff, setIsVideoOff] = useState<boolean>(false);
  const [isFrontCamera, setIsFrontCamera] = useState<boolean>(true);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [showChatOverlay, setShowChatOverlay] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<{ id: string; sender: string; text: string }[]>([]);
  const [liveInputText, setLiveInputText] = useState<string>('');
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [safetyNoticeAccepted, setSafetyNoticeAccepted] = useState<boolean>(true);

  const peerIndexRef = useRef<number>(0);
  const timerRef = useRef<any>(null);

  // Call duration timer
  useEffect(() => {
    if (matchState === 'connected') {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [matchState]);

  const startMatching = async () => {
    setMatchState('searching');
    setCurrentPeer(null);
    setChatMessages([]);

    try {
      // Call backend matchmaking queue endpoint
      const queueRes = await api.joinLiveQueue({
        interests: user?.interests || [],
        gender_preference: 'Any',
      });

      // Simulate instantaneous pairing or queue resolution
      setTimeout(() => {
        const nextPeer = queueRes?.peer || SAMPLE_PEERS[peerIndexRef.current % SAMPLE_PEERS.length];
        peerIndexRef.current += 1;
        setCurrentPeer(nextPeer);
        setSessionId(queueRes?.session_id || `sess_${Date.now()}`);
        setMatchState('connected');

        // Initial welcome message in live chat
        setChatMessages([
          {
            id: 'sys_1',
            sender: 'System',
            text: `Connected with ${nextPeer.name} from ${nextPeer.city}! Say hello 👋`,
          },
        ]);
      }, 1800);
    } catch (e) {
      console.log('Error joining live queue:', e);
      // Fallback matching
      setTimeout(() => {
        const nextPeer = SAMPLE_PEERS[peerIndexRef.current % SAMPLE_PEERS.length];
        peerIndexRef.current += 1;
        setCurrentPeer(nextPeer);
        setSessionId(`sess_${Date.now()}`);
        setMatchState('connected');
      }, 2000);
    }
  };

  const handleNextMatch = async () => {
    // Omegle-style instantaneous next skip
    if (sessionId) {
      api.leaveLiveQueue().catch(() => {});
    }
    setMatchState('searching');
    setCurrentPeer(null);
    setChatMessages([]);

    setTimeout(() => {
      const nextPeer = SAMPLE_PEERS[peerIndexRef.current % SAMPLE_PEERS.length];
      peerIndexRef.current += 1;
      setCurrentPeer(nextPeer);
      setSessionId(`sess_${Date.now()}`);
      setMatchState('connected');
      setChatMessages([
        {
          id: `sys_${Date.now()}`,
          sender: 'System',
          text: `Connected with ${nextPeer.name}! 👋`,
        },
      ]);
    }, 1400);
  };

  const handleEndCall = () => {
    if (sessionId) {
      api.leaveLiveQueue().catch(() => {});
    }
    setMatchState('idle');
    setCurrentPeer(null);
    setSessionId(null);
  };

  const handleSendLiveChat = () => {
    if (!liveInputText.trim()) return;
    const msg = {
      id: `msg_${Date.now()}`,
      sender: user?.name || 'You',
      text: liveInputText.trim(),
    };
    setChatMessages((prev) => [...prev, msg]);
    setLiveInputText('');

    // Simulate peer reply
    setTimeout(() => {
      if (matchState === 'connected' && currentPeer) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `msg_peer_${Date.now()}`,
            sender: currentPeer.name,
            text: 'Hey! Nice to meet you on Nearby Friends Live 😄',
          },
        ]);
      }
    }, 2000);
  };

  const handleReportUser = async (reason: string, details: string) => {
    try {
      if (currentPeer) {
        await api.reportLiveUser({
          session_id: sessionId,
          reported_user_id: currentPeer.id,
          reason,
          details,
        });
      }
    } catch (e) {
      console.log('Error reporting user:', e);
    } finally {
      setShowReportModal(false);
      handleEndCall();
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]} testID="live-connect-screen">
      {/* Top Controls Bar */}
      <View style={styles.topBar}>
        <Pressable
          testID="live-close-btn"
          style={styles.topIconBtn}
          onPress={() => {
            handleEndCall();
            router.back();
          }}
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </Pressable>

        <View style={styles.statusPill}>
          <View
            style={[
              styles.statusDot,
              matchState === 'connected' ? styles.statusDotLive : styles.statusDotSearching,
            ]}
          />
          <Text style={styles.statusText} testID="live-status-indicator">
            {matchState === 'connected'
              ? `LIVE • ${formatTimer(callDuration)}`
              : matchState === 'searching'
              ? 'MATCHING...'
              : 'LIVE CONNECT'}
          </Text>
        </View>

        {matchState === 'connected' ? (
          <Pressable
            testID="live-report-btn"
            style={styles.topIconBtn}
            onPress={() => setShowReportModal(true)}
          >
            <Ionicons name="shield-outline" size={20} color={THEME.colors.error} />
          </Pressable>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>

      {/* Main View Area */}
      {matchState === 'idle' ? (
        <View style={styles.idleContainer} testID="live-idle-view">
          <View style={styles.radarGraphicWrap}>
            <View style={styles.radarPulseRing1} />
            <View style={styles.radarPulseRing2} />
            <View style={styles.idleIconWrap}>
              <Ionicons name="videocam" size={48} color={THEME.colors.brandPrimary} />
            </View>
          </View>

          <Text style={styles.idleTitle}>Live Connect</Text>
          <Text style={styles.idleSubtitle}>
            Omegle-style spontaneous 1-on-1 video chats with verified nearby community members.
          </Text>

          {/* Safety Rule Card */}
          <View style={styles.safetyCard}>
            <View style={styles.safetyCardHeader}>
              <Ionicons name="shield-checkmark" size={18} color={THEME.colors.success} />
              <Text style={styles.safetyCardTitle}>Community Safety Guarantee</Text>
            </View>
            <Text style={styles.safetyCardText}>
              • 18+ Age Verified Only{'\n'}
              • No explicit or abusive behavior tolerated{'\n'}
              • Tap "Next" anytime to rematch instantly
            </Text>
          </View>

          <Pressable
            testID="start-live-matching-btn"
            style={styles.startMatchingBigBtn}
            onPress={startMatching}
          >
            <Ionicons name="flash" size={20} color="#FFFFFF" />
            <Text style={styles.startMatchingBigBtnText}>Start Live Video Match</Text>
          </Pressable>
        </View>
      ) : matchState === 'searching' ? (
        <View style={styles.searchingContainer} testID="live-searching-view">
          <View style={styles.radarGraphicWrap}>
            <View style={styles.radarPulseRingSearching} />
            <View style={styles.searchingCenterWrap}>
              <Ionicons name="compass" size={44} color={THEME.colors.brandPrimary} />
            </View>
          </View>

          <Text style={styles.searchingTitle}>Looking for someone nearby...</Text>
          <Text style={styles.searchingSubtitle}>
            Matching your interests: {user?.interests?.join(', ') || 'Music, Travel'}
          </Text>

          <Pressable
            testID="cancel-matching-btn"
            style={styles.cancelMatchingBtn}
            onPress={handleEndCall}
          >
            <Text style={styles.cancelMatchingText}>Cancel</Text>
          </Pressable>
        </View>
      ) : (
        /* CONNECTED LIVE VIDEO VIEW */
        <View style={styles.videoRoomContainer} testID="live-connected-room-view">
          {/* Remote Peer Stream View */}
          <View style={styles.remoteVideoWrapper}>
            {currentPeer?.avatar ? (
              <Image
                source={{ uri: currentPeer.avatar }}
                style={styles.remoteVideoFeed}
                contentFit="cover"
              />
            ) : (
              <View style={styles.remotePlaceholder}>
                <Ionicons name="person" size={72} color={THEME.colors.onSurfaceTertiary} />
              </View>
            )}

            {/* Remote Peer Info Overlay Banner */}
            <View style={styles.peerInfoBadge} testID="peer-info-badge">
              <Text style={styles.peerNameText}>{currentPeer?.name}, {currentPeer?.age || 23}</Text>
              <Text style={styles.peerCityText}>
                <Ionicons name="location-sharp" size={12} color={THEME.colors.brandPrimary} />
                {' '}{currentPeer?.city || 'Nearby'}
              </Text>
            </View>
          </View>

          {/* Floating Local Camera Preview (PiP) */}
          <View style={styles.localPipFeed} testID="local-pip-camera-view">
            {isVideoOff ? (
              <View style={styles.localVideoOffWrap}>
                <Ionicons name="videocam-off" size={24} color="#FFFFFF" />
                <Text style={styles.localVideoOffText}>Cam Off</Text>
              </View>
            ) : (
              <Image
                source={{ uri: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500' }}
                style={styles.localPipImage}
                contentFit="cover"
              />
            )}
            <View style={styles.pipLabelBadge}>
              <Text style={styles.pipLabelText}>You ({isFrontCamera ? 'Front' : 'Back'})</Text>
            </View>
          </View>

          {/* In-Call Live Chat Messages Overlay */}
          {showChatOverlay && (
            <View style={styles.liveChatContainer} testID="live-chat-overlay">
              <ScrollView style={styles.liveChatScroll} showsVerticalScrollIndicator={false}>
                {chatMessages.map((msg) => (
                  <View
                    key={msg.id}
                    style={[
                      styles.chatBubble,
                      msg.sender === (user?.name || 'You')
                        ? styles.chatBubbleMine
                        : msg.sender === 'System'
                        ? styles.chatBubbleSystem
                        : styles.chatBubblePeer,
                    ]}
                  >
                    <Text style={styles.chatBubbleSender}>{msg.sender}</Text>
                    <Text style={styles.chatBubbleText}>{msg.text}</Text>
                  </View>
                ))}
              </ScrollView>

              {/* Chat Input */}
              <View style={styles.liveChatInputRow}>
                <TextInput
                  testID="live-chat-input"
                  style={styles.liveChatInput}
                  placeholder="Type a message..."
                  placeholderTextColor={THEME.colors.tabInactive}
                  value={liveInputText}
                  onChangeText={setLiveInputText}
                  onSubmitEditing={handleSendLiveChat}
                />
                <Pressable
                  testID="send-live-chat-btn"
                  style={styles.sendLiveChatBtn}
                  onPress={handleSendLiveChat}
                >
                  <Ionicons name="send" size={14} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          )}

          {/* Bottom Floating Video Call Controls Bar */}
          <View style={styles.bottomControlsBar} testID="live-controls-bar">
            {/* Mute Audio Toggle */}
            <Pressable
              testID="toggle-mic-btn"
              style={[styles.controlCircleBtn, isMuted && styles.controlCircleBtnActive]}
              onPress={() => setIsMuted(!isMuted)}
            >
              <Ionicons
                name={isMuted ? 'mic-off' : 'mic'}
                size={22}
                color={isMuted ? '#FFFFFF' : THEME.colors.onSurface}
              />
            </Pressable>

            {/* Video Cam Toggle */}
            <Pressable
              testID="toggle-video-btn"
              style={[styles.controlCircleBtn, isVideoOff && styles.controlCircleBtnActive]}
              onPress={() => setIsVideoOff(!isVideoOff)}
            >
              <Ionicons
                name={isVideoOff ? 'videocam-off' : 'videocam'}
                size={22}
                color={isVideoOff ? '#FFFFFF' : THEME.colors.onSurface}
              />
            </Pressable>

            {/* Flip Camera */}
            <Pressable
              testID="flip-camera-btn"
              style={styles.controlCircleBtn}
              onPress={() => setIsFrontCamera(!isFrontCamera)}
            >
              <Ionicons name="camera-reverse-outline" size={22} color={THEME.colors.onSurface} />
            </Pressable>

            {/* Toggle Chat Overlay */}
            <Pressable
              testID="toggle-live-chat-btn"
              style={[styles.controlCircleBtn, showChatOverlay && styles.controlCircleBtnSelected]}
              onPress={() => setShowChatOverlay(!showChatOverlay)}
            >
              <Ionicons
                name={showChatOverlay ? 'chatbubbles' : 'chatbubbles-outline'}
                size={22}
                color={showChatOverlay ? '#FFFFFF' : THEME.colors.onSurface}
              />
            </Pressable>

            {/* NEXT MATCH OMEGLE-STYLE BUTTON */}
            <Pressable
              testID="next-match-btn"
              style={styles.nextMatchBtn}
              onPress={handleNextMatch}
            >
              <Ionicons name="play-skip-forward" size={18} color="#FFFFFF" />
              <Text style={styles.nextMatchText}>Next</Text>
            </Pressable>

            {/* End Call Button */}
            <Pressable
              testID="end-live-call-btn"
              style={styles.endCallBtn}
              onPress={handleEndCall}
            >
              <Ionicons name="call" size={22} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      )}

      {/* Report User Modal */}
      <ReportModal
        visible={showReportModal}
        targetUserName={currentPeer?.name}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleReportUser}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0E',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.sm,
    zIndex: 20,
  },
  topIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radius.pill,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotLive: {
    backgroundColor: THEME.colors.success,
  },
  statusDotSearching: {
    backgroundColor: THEME.colors.warning,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  idleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: THEME.spacing.xl,
  },
  radarGraphicWrap: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: THEME.spacing.lg,
  },
  radarPulseRing1: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 107, 107, 0.25)',
  },
  radarPulseRing2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 107, 107, 0.4)',
  },
  idleIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleTitle: {
    fontSize: THEME.typography.scale['2xl'],
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  idleSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: THEME.spacing.xl,
  },
  safetyCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: THEME.radius.md,
    padding: THEME.spacing.md,
    width: '100%',
    marginBottom: THEME.spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  safetyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  safetyCardTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  safetyCardText: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 18,
  },
  startMatchingBigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.colors.brandPrimary,
    width: '100%',
    paddingVertical: 14,
    borderRadius: THEME.radius.pill,
    shadowColor: THEME.colors.brandPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  startMatchingBigBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  searchingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: THEME.spacing.xl,
  },
  radarPulseRingSearching: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: THEME.colors.brandPrimary,
  },
  searchingCenterWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchingTitle: {
    fontSize: THEME.typography.scale.lg,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: THEME.spacing.lg,
    marginBottom: 4,
  },
  searchingSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: THEME.spacing.xl,
  },
  cancelMatchingBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: THEME.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  cancelMatchingText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  videoRoomContainer: {
    flex: 1,
    position: 'relative',
  },
  remoteVideoWrapper: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#15151E',
  },
  remoteVideoFeed: {
    width: '100%',
    height: '100%',
  },
  remotePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  peerInfoBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radius.md,
  },
  peerNameText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  peerCityText: {
    color: '#E5E7EB',
    fontSize: 11,
    fontWeight: '500',
  },
  localPipFeed: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 105,
    height: 145,
    borderRadius: THEME.radius.md,
    overflow: 'hidden',
    backgroundColor: '#2A2A38',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 10,
  },
  localPipImage: {
    width: '100%',
    height: '100%',
  },
  localVideoOffWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E1E28',
  },
  localVideoOffText: {
    color: '#FFFFFF',
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
  pipLabelBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 2,
    borderRadius: 4,
    alignItems: 'center',
  },
  pipLabelText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  liveChatContainer: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 16,
    maxHeight: 180,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: THEME.radius.md,
    padding: 10,
    zIndex: 15,
  },
  liveChatScroll: {
    maxHeight: 110,
  },
  chatBubble: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  chatBubbleMine: {
    backgroundColor: THEME.colors.brandPrimary,
    alignSelf: 'flex-end',
  },
  chatBubblePeer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
  },
  chatBubbleSystem: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignSelf: 'center',
  },
  chatBubbleSender: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  chatBubbleText: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  liveChatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  liveChatInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: THEME.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    color: '#FFFFFF',
    fontSize: 12,
  },
  sendLiveChatBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: THEME.colors.brandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomControlsBar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(20, 20, 30, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: THEME.radius.pill,
    zIndex: 20,
  },
  controlCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlCircleBtnActive: {
    backgroundColor: THEME.colors.error,
  },
  controlCircleBtnSelected: {
    backgroundColor: THEME.colors.brandPrimary,
  },
  nextMatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.brandPrimary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: THEME.radius.pill,
  },
  nextMatchText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  endCallBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '135deg' }],
  },
});
