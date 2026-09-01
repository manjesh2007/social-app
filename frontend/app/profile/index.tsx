import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '@/src/theme';
import { useAuth } from '@/src/context/AuthContext';
import { api } from '@/src/api/client';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [friendsCount, setFriendsCount] = useState<number>(0);

  useEffect(() => {
    loadProfileStats();
  }, []);

  const loadProfileStats = async () => {
    try {
      const [feed, friends] = await Promise.all([
        api.getFeed().catch(() => ({ posts: [] })),
        api.getFriends().catch(() => []),
      ]);
      const myPosts = (feed.posts || []).filter((p: any) => p.user_id === user?.id);
      setUserPosts(myPosts);
      setFriendsCount(friends.length || 0);
    } catch (e) {
      console.log('Error loading stats:', e);
    }
  };

  return (
    <ScrollView
      style={[styles.screen, { paddingTop: insets.top }]}
      contentContainerStyle={styles.scrollContent}
      testID="profile-screen"
    >
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable testID="profile-back-btn" onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={THEME.colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle} testID="profile-screen-title">Profile</Text>
        <Pressable testID="edit-profile-btn" onPress={() => router.push('/profile/edit')} style={styles.iconBtn}>
          <Ionicons name="pencil-sharp" size={20} color={THEME.colors.brandPrimary} />
        </Pressable>
      </View>

      {/* Profile Card */}
      <View style={styles.profileHeroCard}>
        <View style={styles.avatarWrap}>
          <Image
            source={{ uri: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500' }}
            style={styles.avatar}
          />
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-sharp" size={14} color="#FFFFFF" />
          </View>
        </View>

        <Text style={styles.userName} testID="profile-user-name">{user?.name || 'User'}</Text>
        <Text style={styles.userMeta}>
          {user?.city || 'Mumbai'} • {user?.age || 23} yrs • {user?.gender || 'Community'}
        </Text>
        <Text style={styles.userBio}>{user?.bio || 'Hey there! I love connecting on Nearby Friends & Live Connect.'}</Text>

        {/* Interests Badges */}
        <View style={styles.interestsRow}>
          {(user?.interests || ['Music', 'Travel', 'Live Connect']).map((item, idx) => (
            <View key={idx} style={styles.interestChip}>
              <Text style={styles.interestText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userPosts.length}</Text>
            <Text style={styles.statLabel}>Moments</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{friendsCount}</Text>
            <Text style={styles.statLabel}>Friends</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>18+</Text>
            <Text style={styles.statLabel}>Age Verified</Text>
          </View>
        </View>
      </View>

      {/* Menu / Settings List */}
      <View style={styles.menuSection}>
        <Pressable
          testID="profile-live-connect-shortcut"
          style={styles.menuItem}
          onPress={() => router.push('/live-connect')}
        >
          <View style={[styles.menuIconWrap, { backgroundColor: THEME.colors.brandTertiary }]}>
            <Ionicons name="videocam" size={20} color={THEME.colors.brandPrimary} />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Live Connect Match</Text>
            <Text style={styles.menuSubtitle}>Join Omegle-style video chat</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={THEME.colors.onSurfaceTertiary} />
        </Pressable>

        <Pressable
          testID="profile-nearby-shortcut"
          style={styles.menuItem}
          onPress={() => router.push('/(tabs)/nearby')}
        >
          <View style={[styles.menuIconWrap, { backgroundColor: '#E0F2FE' }]}>
            <Ionicons name="compass" size={20} color={THEME.colors.info} />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuTitle}>Nearby Radar</Text>
            <Text style={styles.menuSubtitle}>Scan local people & distances</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={THEME.colors.onSurfaceTertiary} />
        </Pressable>

        <Pressable
          testID="logout-btn"
          style={[styles.menuItem, styles.logoutItem]}
          onPress={logout}
        >
          <View style={[styles.menuIconWrap, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="log-out" size={20} color={THEME.colors.error} />
          </View>
          <View style={styles.menuContent}>
            <Text style={[styles.menuTitle, { color: THEME.colors.error }]}>Log Out</Text>
            <Text style={styles.menuSubtitle}>Sign out from Nearby Friends</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={THEME.colors.error} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
  },
  headerTitle: {
    fontSize: THEME.typography.scale.lg,
    fontWeight: '800',
    color: THEME.colors.onSurface,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHeroCard: {
    backgroundColor: THEME.colors.cardBackground,
    marginHorizontal: THEME.spacing.lg,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: THEME.spacing.lg,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: THEME.spacing.sm,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: THEME.colors.surfaceSecondary,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.colors.brandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: THEME.typography.scale.xl,
    fontWeight: '800',
    color: THEME.colors.onSurface,
    marginBottom: 2,
  },
  userMeta: {
    fontSize: 13,
    color: THEME.colors.onSurfaceTertiary,
    marginBottom: 8,
  },
  userBio: {
    fontSize: 13,
    color: THEME.colors.onSurfaceSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: THEME.spacing.md,
  },
  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: THEME.spacing.lg,
  },
  interestChip: {
    backgroundColor: THEME.colors.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.radius.pill,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  interestText: {
    fontSize: 12,
    color: THEME.colors.onSurfaceSecondary,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.divider,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.colors.brandPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: THEME.colors.onSurfaceTertiary,
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: THEME.colors.divider,
  },
  menuSection: {
    paddingHorizontal: THEME.spacing.lg,
    gap: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.cardBackground,
    padding: THEME.spacing.md,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 12,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.onSurface,
  },
  menuSubtitle: {
    fontSize: 12,
    color: THEME.colors.onSurfaceTertiary,
  },
  logoutItem: {
    borderColor: '#FECACA',
  },
});
