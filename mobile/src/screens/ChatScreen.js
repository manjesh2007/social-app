import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import MessageBubble from '../components/MessageBubble';
import api, { SOCKET_URL } from '../api/api';

export default function ChatScreen({ route, navigation }) {
  const { friend } = route.params;
  const { theme } = useTheme();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const socketRef = useRef(null);
  const listRef = useRef(null);
  const styles = createStyles(theme);

  useEffect(() => {
    navigation.setOptions({ title: friend.name });
  }, [navigation, friend]);

  const loadHistory = useCallback(async () => {
    const res = await api.get(`/chat/${friend.id}`);
    setMessages(res.data.messages);
  }, [friend.id]);

  useEffect(() => {
    loadHistory();

    (async () => {
      const token = await AsyncStorage.getItem('authToken');
      const socket = io(SOCKET_URL, { auth: { token } });
      socketRef.current = socket;

      socket.on('message:new', (message) => {
        if (message.sender === friend.id || message.recipient === friend.id) {
          setMessages((prev) => [...prev, message]);
        }
      });
    })();

    return () => {
      socketRef.current?.disconnect();
    };
  }, [friend.id, loadHistory]);

  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    try {
      const res = await api.post(`/chat/${friend.id}`, { text: trimmed });
      setMessages((prev) => [...prev, res.data.message]);
    } catch (err) {
      // Optionally surface an error toast here
    }
  };

  return (
    <KeyboardAvoidingView
  style={styles.container}
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item._id || `${item.createdAt}-${item.text}`}
        contentContainerStyle={{ padding: 16 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <MessageBubble
            text={item.text}
            isMine={item.sender === user?.id}
            timestamp={new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          />
        )}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          placeholderTextColor={theme.textSecondary}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      padding: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.surface,
    },
    input: {
      flex: 1,
      backgroundColor: theme.inputBackground,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 15,
      color: theme.text,
      maxHeight: 120,
      marginRight: 8,
    },
    sendButton: {
      backgroundColor: theme.primary,
      borderRadius: 20,
      paddingHorizontal: 18,
      paddingVertical: 12,
    },
    sendButtonText: { color: theme.primaryText, fontWeight: '700', fontSize: 14 },
  });
