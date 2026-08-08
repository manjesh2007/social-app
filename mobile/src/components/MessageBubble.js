import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function MessageBubble({ text, isMine, timestamp }) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={isMine ? styles.textMine : styles.textTheirs}>{text}</Text>
      </View>
      {!!timestamp && <Text style={styles.timestamp}>{timestamp}</Text>}
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    row: { marginVertical: 4, maxWidth: '80%' },
    rowMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
    rowTheirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
    bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
    bubbleMine: { backgroundColor: theme.bubbleMine, borderBottomRightRadius: 4 },
    bubbleTheirs: { backgroundColor: theme.bubbleTheirs, borderBottomLeftRadius: 4 },
    textMine: { color: theme.bubbleTextMine, fontSize: 15 },
    textTheirs: { color: theme.bubbleTextTheirs, fontSize: 15 },
    timestamp: { fontSize: 10, color: theme.textSecondary, marginTop: 3, marginHorizontal: 4 },
  });
