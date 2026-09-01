import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '@/src/theme';
import { api } from '@/src/api/client';
import { EmptyState } from '@/src/components/EmptyState';
import { LoadingSkeleton } from '@/src/components/LoadingSkeleton';
import { router, useFocusEffect } from 'expo-router';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('All');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadNotifs = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (e) {
      console.log('Error loading notifications:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadNotifs();
    }, [])
  );

  useEffect(() => {
    loadNotifs();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.markNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {
      console.log('Error marking notifications as read:', e);
    }
  };

  const filteredNotifs = notifications.filter((n) => {
    if (filter === 'Requests') return n.type === 'friend_request';
    if (filter === 'Likes') return n.type === 'like' || n.type === 'comment';
    if (filter === 'Radar') return n.type === 'radar_alert';
    return true;
  });

  const getIconForType = (type: string) => {
    switch (type) {
      case 'friend_request':
        return <Ionicons name="person-add" size={14} color={THEME.colors.brandPrimary} />;
      case 'like':
        return <Ionicons name="heart" size={14} color={THEME.colors.brandPrimary} />;
      case 'comment':
        return <Ionicons name="chatbubble" size={14} color={THEME.colors.info} />;
      case 'radar_alert':
        return <Ionicons name="compass" size={14} color={THEME.colors.brandSecondary} />;
      default:
        return <Ionicons name="notifications" size={14} color={THEME.colors.brandPrimary} />;
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]} testID="notifications-screen">
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.title} testID="notifications-title">Notifications</Text>
        <Pressable testID="mark-all-read-btn" onPress={handleMarkAllRead} style={styles.markReadBtn}>
          <Ionicons name="checkmark-done" size={16} color={THEME.colors.brandPrimary} />
          <Text style={styles.markReadText}>Mark read</Text>
        </Pressable>
      </View>

      {/* Filter Chips */}
      <View style={styles.chipsRow}>
        {['All', 'Requests', 'Likes', 'Radar'].map((f) => (
          <Pressable
            key={f}
            testID={`filter-chip-${f.toLowerCase()}`}
            style={[styles.chip, filter === f && styles.chipSelected]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextSelected]}>{f}</Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <FlatList
          data={filteredNotifs}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => {
                setIsRefreshing(true);
                loadNotifs();
              }}
            />
          }
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <View
              style={[styles.notifCard, !item.is_read && styles.unreadCard]}
              testID={`notif-card-${item.id}`}
            >
              <View style={styles.avatarWrapper}>
                <Image
                  source={{ uri: item.sender_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500' }}
                  style={styles.avatar}
                />
                <View style={styles.typeIconBadge}>{getIconForType(item.type)}</View>
              </View>

              <View style={styles.contentCol}>
                <Text style={styles.messageText}>
                  <Text style={styles.senderName}>{item.sender_name} </Text>
                  {item.message}
                </Text>
              </View>

              {item.type === 'friend_request' && (
                <Pressable
                  testID={`notif-view-req-btn-${item.id}`}
                  style={styles.actionBtn}
                  onPress={() => router.push('/(tabs)/friends')}
                >
                  <Text style={styles.actionBtnText}>View</Text>
                </Pressable>
              )}
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="notifications-off-outline"
              title="All Caught Up!"
              description="No notifications right now. Engage with friends and posts to see updates."
              testID="empty-notifications-state"
            />
          }
        />
      )}
    </View>
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
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.divider,
  },
  title: {
    fontSize: THEME.typography.scale.xl,
    fontWeight: '800',
    color: THEME.colors.onSurface,
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.brandTertiary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radius.pill,
  },
  markReadText: {
    color: THEME.colors.onBrandTertiary,
    fontSize: 12,
    fontWeight: '700',
  },
  chipsRow: {
    flexDirection: 'row',
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: THEME.radius.pill,
    backgroundColor: THEME.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  chipSelected: {
    backgroundColor: THEME.colors.brandPrimary,
    borderColor: THEME.colors.brandPrimary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.onSurfaceSecondary,
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContainer: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: 40,
    gap: 8,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.md,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.cardBackground,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 12,
  },
  unreadCard: {
    backgroundColor: THEME.colors.surfaceSecondary,
    borderColor: THEME.colors.brandTertiary,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  typeIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
  },
  contentCol: {
    flex: 1,
  },
  messageText: {
    fontSize: 13,
    color: THEME.colors.onSurfaceSecondary,
    lineHeight: 18,
  },
  senderName: {
    fontWeight: '700',
    color: THEME.colors.onSurface,
  },
  actionBtn: {
    backgroundColor: THEME.colors.brandPrimary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radius.pill,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
