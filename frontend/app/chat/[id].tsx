import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '@/src/theme';
import { api } from '@/src/api/client';
import { useAuth } from '@/src/context/AuthContext';
import { useLocalSearchParams, router } from 'expo-router';

interface ChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  recipient_id: string;
  text: string;
  image_url?: string;
  created_at: string;
}

export default function ChatDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [partnerInfo, setPartnerInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const flatListRef = useRef<FlatList>(null);

  const loadMessages = async () => {
    if (!id) return;
    try {
      const msgs = await api.getChatMessages(id);
      setMessages(msgs);

      // Find partner info from chats
      const chats = await api.getChats().catch(() => []);
      const currentChat = chats.find((c: any) => c.id === id);
      if (currentChat) {
        setPartnerInfo({
          id: currentChat.partner_id,
          name: currentChat.partner_name,
          avatar: currentChat.partner_avatar,
          city: currentChat.partner_city,
          is_online: currentChat.is_online,
        });
      }
    } catch (e) {
      console.log('Error loading messages:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 4000);
    return () => clearInterval(interval);
  }, [id]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !id) return;
    const textToSend = inputText.trim();
    setInputText('');

    // Optimistic message
    const tempMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      chat_id: id,
      sender_id: user?.id || 'me',
      recipient_id: partnerInfo?.id || '',
      text: textToSend,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      await api.sendMessage(id, {
        recipient_id: partnerInfo?.id || '',
        text: textToSend,
      });
      loadMessages();
    } catch (e) {
      console.log('Error sending message:', e);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      testID="chat-detail-screen"
    >
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable testID="chat-back-btn" onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={THEME.colors.onSurface} />
        </Pressable>

        <View style={styles.partnerHeader}>
          <View style={styles.avatarWrap}>
            <Image
              source={{ uri: partnerInfo?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500' }}
              style={styles.avatar}
            />
            {partnerInfo?.is_online && <View style={styles.onlineBadge} />}
          </View>
          <View>
            <Text style={styles.partnerName} testID="chat-partner-name">
              {partnerInfo?.name || 'Chat'}
            </Text>
            <Text style={styles.partnerStatus}>
              {partnerInfo?.is_online ? 'Active now' : partnerInfo?.city || 'Nearby Friend'}
            </Text>
          </View>
        </View>

        <Pressable
          testID="chat-live-video-call-btn"
          style={styles.videoCallBtn}
          onPress={() => router.push('/live-connect')}
        >
          <Ionicons name="videocam" size={20} color={THEME.colors.brandPrimary} />
        </Pressable>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const isMine = item.sender_id === user?.id;
          return (
            <View
              style={[styles.bubbleWrap, isMine ? styles.bubbleWrapMine : styles.bubbleWrapPartner]}
              testID={`chat-message-bubble-${item.id}`}
            >
              <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubblePartner]}>
                <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextPartner]}>
                  {item.text}
                </Text>
              </View>
            </View>
          );
        }}
      />

      {/* Bottom Input Row */}
      <View style={styles.inputBar}>
        <TextInput
          testID="chat-message-input"
          style={styles.textInput}
          placeholder="Message..."
          placeholderTextColor={THEME.colors.tabInactive}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSendMessage}
        />
        <Pressable
          testID="send-chat-message-btn"
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          disabled={!inputText.trim()}
          onPress={handleSendMessage}
        >
          <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.divider,
  },
  backBtn: {
    padding: 6,
  },
  partnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginLeft: 4,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: THEME.colors.success,
    borderWidth: 2,
    borderColor: THEME.colors.surface,
  },
  partnerName: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.onSurface,
  },
  partnerStatus: {
    fontSize: 11,
    color: THEME.colors.onSurfaceTertiary,
  },
  videoCallBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.colors.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesContainer: {
    padding: THEME.spacing.md,
    gap: 8,
  },
  bubbleWrap: {
    flexDirection: 'row',
  },
  bubbleWrapMine: {
    justifyContent: 'flex-end',
  },
  bubbleWrapPartner: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleMine: {
    backgroundColor: THEME.colors.brandPrimary,
    borderBottomRightRadius: 4,
  },
  bubblePartner: {
    backgroundColor: THEME.colors.surfaceSecondary,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 19,
  },
  bubbleTextMine: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  bubbleTextPartner: {
    color: THEME.colors.onSurface,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    backgroundColor: THEME.colors.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.divider,
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceSecondary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: THEME.radius.pill,
    fontSize: 14,
    color: THEME.colors.onSurface,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.colors.brandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
