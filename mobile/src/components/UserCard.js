import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function UserCard({ user, actionLabel, onAction, actionDisabled, onPress }) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const initials = (user.name || '?').charAt(0).toUpperCase();

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} disabled={!onPress} activeOpacity={0.8}>
      {user.photoUrl ? (
        <Image source={{ uri: user.photoUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarInitial}>{initials}</Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.name}>{user.name}</Text>
        {!!user.distance && <Text style={styles.meta}>{user.distance}</Text>}
        {!!user.bio && (
          <Text style={styles.bio} numberOfLines={2}>
            {user.bio}
          </Text>
        )}
        {!!user.interests?.length && (
          <View style={styles.tags}>
            {user.interests.slice(0, 3).map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {actionLabel && (
        <TouchableOpacity
          style={[styles.actionButton, actionDisabled && styles.actionButtonDisabled]}
          onPress={onAction}
          disabled={actionDisabled}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    avatar: { width: 56, height: 56, borderRadius: 28, marginRight: 12, backgroundColor: theme.inputBackground },
    avatarFallback: { alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { fontSize: 20, fontWeight: '700', color: theme.primary },
    info: { flex: 1 },
    name: { fontSize: 16, fontWeight: '700', color: theme.text },
    meta: { fontSize: 12, color: theme.primary, marginTop: 2, fontWeight: '600' },
    bio: { fontSize: 13, color: theme.textSecondary, marginTop: 4 },
    tags: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, gap: 6 },
    tag: { backgroundColor: theme.inputBackground, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    tagText: { fontSize: 11, color: theme.textSecondary, fontWeight: '600' },
    actionButton: {
      backgroundColor: theme.primary,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginLeft: 8,
    },
    actionButtonDisabled: { backgroundColor: theme.border },
    actionText: { color: theme.primaryText, fontSize: 12, fontWeight: '700' },
  });
