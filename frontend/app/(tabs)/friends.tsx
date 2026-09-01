import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '@/src/theme';
import { api } from '@/src/api/client';
import { useAuth } from '@/src/context/AuthContext';
import { router, useFocusEffect } from 'expo-router';
import { EmptyState } from '@/src/components/EmptyState';
import { LoadingSkeleton } from '@/src/components/LoadingSkeleton';

type SubTab = 'chats' | 'friends' | 'requests';

export default function FriendsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SubTab>('chats');
  const [chats, setChats] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadData = async () => {
    try {
      const [chatsRes, friendsRes, reqsRes] = await Promise.all([
        api.getChats().catch(() => []),
        api.getFriends().catch(() => []),
        api.getFriendRequests().catch(() => []),
      ]);
      setChats(chatsRes);
      setFriends(friendsRes);
      setRequests(reqsRes);
    } catch (e) {
      console.log('Error loading friends/chats:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    loadData();
  }, []);

  const handleRespondRequest = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      await api.respondFriendRequest(requestId, action);
      loadData();
    } catch (e) {
      console.log('Error responding request:', e);
    }
  };

  const filteredChats = chats.filter((c) =>
    c.partner_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFriends = friends.filter((f) =>
    f.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]} testID="friends-tab-screen">
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.title} testID="friends-screen-title">Friends & Messages</Text>
        <Pressable
          testID="live-connect-top-shortcut"
          style={styles.liveConnectBtn}
          onPress={() => router.push('/live-connect')}
        >
          <Ionicons name="videocam" size={16} color="#FFFFFF" />
          <Text style={styles.liveConnectText}>Live</Text>
        </Pressable>
      </View>

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={THEME.colors.onSurfaceTertiary} />
        <TextInput
          testID="friends-search-input"
          style={styles.searchInput}
          placeholder="Search friends and conversations..."
          placeholderTextColor={THEME.colors.tabInactive}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable testID="clear-search-btn" onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={THEME.colors.onSurfaceTertiary} />
          </Pressable>
        )}
      </View>

      {/* Segmented Filter Chips */}
      <View style={styles.tabPillRow}>
        <Pressable
          testID="subtab-chats-btn"
          style={[styles.tabPill, activeTab === 'chats' && styles.tabPillActive]}
          onPress={() => setActiveTab('chats')}
        >
          <Text style={[styles.tabPillText, activeTab === 'chats' && styles.tabPillTextActive]}>
            Chats ({chats.length})
          </Text>
        </Pressable>

        <Pressable
          testID="subtab-friends-btn"
          style={[styles.tabPill, activeTab === 'friends' && styles.tabPillActive]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabPillText, activeTab === 'friends' && styles.tabPillTextActive]}>
            Friends ({friends.length})
          </Text>
        </Pressable>

        <Pressable
          testID="subtab-requests-btn"
          style={[styles.tabPill, activeTab === 'requests' && styles.tabPillActive]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabPillText, activeTab === 'requests' && styles.tabPillTextActive]}>
            Requests {requests.length > 0 ? `(${requests.length})` : ''}
          </Text>
        </Pressable>
      </View>

      {/* Content depending on Active Tab */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : activeTab === 'chats' ? (
        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); loadData(); }} />
          }
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <Pressable
              testID={`chat-item-${item.id}`}
              style={styles.chatRow}
              onPress={() => router.push(`/chat/${item.id}`)}
            >
              <View style={styles.avatarWrapper}>
                <Image
                  source={{ uri: item.partner_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500' }}
                  style={styles.chatAvatar}
                  contentFit="cover"
                />
                {item.is_online && <View style={styles.onlineBadge} />}
              </View>

              <View style={styles.chatInfo}>
                <View style={styles.chatHeader}>
                  <Text style={styles.partnerName}>{item.partner_name}</Text>
                  <Text style={styles.chatCity}>{item.partner_city}</Text>
                </View>
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {item.last_message || 'Start chatting...'}
                </Text>
              </View>

              {item.unread_count > 0 && (
                <View style={styles.unreadCountBadge}>
                  <Text style={styles.unreadCountText}>{item.unread_count}</Text>
                </View>
              )}
            </Pressable>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubbles-outline"
              title="No Active Chats"
              description="Connect with nearby friends or accept friend requests to chat!"
              actionText="Discover Nearby"
              onAction={() => router.push('/(tabs)/nearby')}
              testID="empty-chats-state"
            />
          }
        />
      ) : activeTab === 'friends' ? (
        <FlatList
          data={filteredFriends}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <View style={styles.friendRow} testID={`friend-item-${item.id}`}>
              <View style={styles.avatarWrapper}>
                <Image
                  source={{ uri: item.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500' }}
                  style={styles.chatAvatar}
                />
                {item.is_online && <View style={styles.onlineBadge} testID={`friend-online-dot-${item.id}`} />}
              </View>
              <View style={styles.chatInfo}>
                <Text style={styles.partnerName}>{item.name}</Text>
                <Text style={styles.chatCity}>
                  {item.is_online ? <Text style={styles.onlineTextLabel}>● Online  </Text> : null}
                  {typeof item.distance_km === 'number' ? `${item.distance_km} km • ` : ''}{item.city || 'Nearby'}
                </Text>
              </View>

              <View style={styles.friendActionRow}>
                <Pressable
                  testID={`open-friend-chat-btn-${item.id}`}
                  style={styles.messageBtn}
                  onPress={() => {
                    const chatId = `chat_${minStr(user?.id, item.id)}_${maxStr(user?.id, item.id)}`;
                    router.push(`/chat/${chatId}`);
                  }}
                >
                  <Ionicons name="chatbubble" size={14} color={THEME.colors.brandPrimary} />
                  <Text style={styles.messageBtnText}>Chat</Text>
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="No Friends Added Yet"
              description="Explore the nearby radar to send requests and connect!"
              actionText="Explore Nearby Radar"
              onAction={() => router.push('/(tabs)/nearby')}
              testID="empty-friends-state"
            />
          }
        />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.request_id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <View style={styles.requestCard} testID={`request-card-${item.request_id}`}>
              <View style={styles.requestHeader}>
                <Image
                  source={{ uri: item.sender_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500' }}
                  style={styles.chatAvatar}
                />
                <View style={styles.chatInfo}>
                  <Text style={styles.partnerName}>{item.sender_name}</Text>
                  <Text style={styles.chatCity}>{item.sender_city} • {item.sender_age} yrs</Text>
                </View>
              </View>

              <View style={styles.requestBtnsRow}>
                <Pressable
                  testID={`accept-request-btn-${item.request_id}`}
                  style={styles.acceptBtn}
                  onPress={() => handleRespondRequest(item.request_id, 'accept')}
                >
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  <Text style={styles.acceptBtnText}>Accept</Text>
                </Pressable>

                <Pressable
                  testID={`reject-request-btn-${item.request_id}`}
                  style={styles.rejectBtn}
                  onPress={() => handleRespondRequest(item.request_id, 'reject')}
                >
                  <Ionicons name="close" size={16} color={THEME.colors.onSurfaceSecondary} />
                  <Text style={styles.rejectBtnText}>Decline</Text>
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="mail-unread-outline"
              title="No Pending Requests"
              description="You have cleared all your friend invitations."
              testID="empty-requests-state"
            />
          }
        />
      )}
    </View>
  );
}

function minStr(a?: string, b?: string) {
  if (!a) return b || '';
  if (!b) return a || '';
  return a < b ? a : b;
}

function maxStr(a?: string, b?: string) {
  if (!a) return b || '';
  if (!b) return a || '';
  return a > b ? a : b;
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
  liveConnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.brandPrimary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radius.pill,
  },
  liveConnectText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceSecondary,
    marginHorizontal: THEME.spacing.lg,
    marginVertical: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 10,
    borderRadius: THEME.radius.pill,
    gap: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: THEME.colors.onSurface,
  },
  tabPillRow: {
    flexDirection: 'row',
    paddingHorizontal: THEME.spacing.lg,
    gap: 8,
    marginBottom: THEME.spacing.md,
  },
  tabPill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: THEME.radius.pill,
    backgroundColor: THEME.colors.surfaceSecondary,
  },
  tabPillActive: {
    backgroundColor: THEME.colors.brandPrimary,
  },
  tabPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: THEME.colors.onSurfaceSecondary,
  },
  tabPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContainer: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: 40,
    gap: 10,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.md,
    backgroundColor: THEME.colors.cardBackground,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 12,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.md,
    backgroundColor: THEME.colors.cardBackground,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  chatAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: THEME.colors.surfaceSecondary,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: THEME.colors.success,
    borderWidth: 2,
    borderColor: THEME.colors.surface,
  },
  onlineTextLabel: {
    color: THEME.colors.success,
    fontWeight: '800',
    fontSize: 11,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  partnerName: {
    fontSize: THEME.typography.scale.base,
    fontWeight: '700',
    color: THEME.colors.onSurface,
  },
  chatCity: {
    fontSize: 11,
    color: THEME.colors.onSurfaceTertiary,
  },
  lastMessage: {
    fontSize: 13,
    color: THEME.colors.onSurfaceSecondary,
  },
  unreadCountBadge: {
    backgroundColor: THEME.colors.brandPrimary,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  friendActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.brandTertiary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radius.pill,
  },
  messageBtnText: {
    color: THEME.colors.onBrandTertiary,
    fontSize: 12,
    fontWeight: '700',
  },
  requestCard: {
    backgroundColor: THEME.colors.cardBackground,
    padding: THEME.spacing.md,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 12,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  requestBtnsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.brandPrimary,
    paddingVertical: 8,
    borderRadius: THEME.radius.pill,
    gap: 6,
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.surfaceSecondary,
    paddingVertical: 8,
    borderRadius: THEME.radius.pill,
    gap: 6,
  },
  rejectBtnText: {
    color: THEME.colors.onSurfaceSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
});
