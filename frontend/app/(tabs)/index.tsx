import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '@/src/components/Header';
import { StoryRail } from '@/src/components/StoryRail';
import { PostCard, Post } from '@/src/components/PostCard';
import { LoadingSkeleton } from '@/src/components/LoadingSkeleton';
import { EmptyState } from '@/src/components/EmptyState';
import { THEME } from '@/src/theme';
import { api } from '@/src/api/client';
import { useAuth } from '@/src/context/AuthContext';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const [feedData, setFeedData] = useState<{ stories: any[]; posts: Post[] }>({ stories: [], posts: [] });
  const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Check auth redirect
  useEffect(() => {
    if (!token && !isLoading) {
      router.replace('/auth/login');
    }
  }, [token, isLoading]);

  const loadFeed = async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const res = await api.getFeed();
      setFeedData(res);
      // Also fetch notifs count
      const notifs = await api.getNotifications().catch(() => []);
      const unread = notifs.filter((n: any) => !n.is_read).length;
      setUnreadNotifsCount(unread);
    } catch (e) {
      console.log('Error loading feed:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadFeed(false);
    }, [])
  );

  useEffect(() => {
    loadFeed(true);
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadFeed(false);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]} testID="home-feed-screen">
      {/* Sticky Top Header */}
      <Header
        showLiveConnectBtn={true}
        unreadNotifsCount={unreadNotifsCount}
      />

      {/* Main Feed List */}
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <LoadingSkeleton />
          <LoadingSkeleton />
        </View>
      ) : (
        <FlatList
          data={feedData.posts}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={THEME.colors.brandPrimary}
              colors={[THEME.colors.brandPrimary]}
            />
          }
          ListHeaderComponent={
            <View>
              {/* Live Connect Hero Card Banner */}
              <Pressable
                testID="live-connect-hero-banner"
                style={styles.heroBanner}
                onPress={() => router.push('/live-connect')}
              >
                <View style={styles.heroContent}>
                  <View style={styles.liveTagRow}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.liveTagText}>LIVE CONNECT</Text>
                  </View>
                  <Text style={styles.heroTitle}>Random 1-on-1 Video Chat</Text>
                  <Text style={styles.heroSubText}>
                    Meet verified nearby users instantly. Omegle-style matching with 1-tap skip!
                  </Text>
                  <View style={styles.startMatchingCta} testID="start-matching-cta-btn">
                    <Ionicons name="play" size={14} color="#FFFFFF" />
                    <Text style={styles.startMatchingText}>Start Video Match</Text>
                  </View>
                </View>
                <View style={styles.heroIconWrap}>
                  <Ionicons name="videocam" size={42} color={THEME.colors.brandPrimary} />
                </View>
              </Pressable>

              {/* Stories Rail */}
              <StoryRail stories={feedData.stories || []} />

              {/* Feed Header Label */}
              <View style={styles.feedHeaderRow}>
                <Text style={styles.feedSectionTitle}>Community Feed</Text>
                <Pressable
                  testID="create-post-shortcut-btn"
                  onPress={() => router.push('/(tabs)/post')}
                  style={styles.createPostShortcut}
                >
                  <Ionicons name="add" size={16} color={THEME.colors.brandPrimary} />
                  <Text style={styles.createPostShortcutText}>Share moment</Text>
                </Pressable>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <PostCard post={item} onUpdate={() => loadFeed(false)} />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="images-outline"
              title="No Posts Yet"
              description="Be the first to share a moment with friends nearby!"
              actionText="Create First Post"
              onAction={() => router.push('/(tabs)/post')}
              testID="empty-feed-state"
            />
          }
          contentContainerStyle={styles.listContent}
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
  loaderContainer: {
    paddingVertical: THEME.spacing.md,
  },
  listContent: {
    paddingBottom: 40,
  },
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surfaceSecondary,
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
    padding: THEME.spacing.lg,
    borderRadius: THEME.radius.lg,
    borderWidth: 1.5,
    borderColor: THEME.colors.brandTertiary,
  },
  heroContent: {
    flex: 1,
    paddingRight: THEME.spacing.sm,
  },
  liveTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.brandPrimary,
  },
  liveTagText: {
    color: THEME.colors.brandPrimary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: THEME.typography.scale.base,
    fontWeight: '800',
    color: THEME.colors.onSurface,
    marginBottom: 2,
  },
  heroSubText: {
    fontSize: 12,
    color: THEME.colors.onSurfaceSecondary,
    lineHeight: 16,
    marginBottom: 10,
  },
  startMatchingCta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: THEME.colors.brandPrimary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radius.pill,
    gap: 6,
  },
  startMatchingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: THEME.colors.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.md,
    paddingBottom: THEME.spacing.xs,
  },
  feedSectionTitle: {
    fontSize: THEME.typography.scale.base,
    fontWeight: '800',
    color: THEME.colors.onSurface,
  },
  createPostShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  createPostShortcutText: {
    color: THEME.colors.brandPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
});
