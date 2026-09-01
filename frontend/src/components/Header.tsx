import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '@/src/theme';
import { router } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';

interface HeaderProps {
  title?: string;
  showLiveConnectBtn?: boolean;
  unreadNotifsCount?: number;
}

export function Header({ title, showLiveConnectBtn = true, unreadNotifsCount = 0 }: HeaderProps) {
  const { user } = useAuth();

  return (
    <View style={styles.headerContainer} testID="app-header">
      <View style={styles.leftSection}>
        <Pressable
          testID="header-profile-button"
          onPress={() => router.push('/profile')}
          style={styles.avatarButton}
        >
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitials}>{user?.name?.slice(0, 2).toUpperCase() || 'NF'}</Text>
            </View>
          )}
          <View style={styles.onlineDot} />
        </Pressable>

        <View>
          <Text style={styles.appName} testID="header-app-title">
            {title || 'Nearby Friends'}
          </Text>
          <Text style={styles.locationTag}>
            <Ionicons name="location-sharp" size={11} color={THEME.colors.brandPrimary} />
            {' '}{user?.city || 'Discovering'}
          </Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        {showLiveConnectBtn && (
          <Pressable
            testID="header-live-connect-btn"
            style={styles.liveConnectBtn}
            onPress={() => router.push('/live-connect')}
          >
            <View style={styles.livePulseDot} />
            <Ionicons name="videocam" size={16} color={THEME.colors.onBrandPrimary} />
            <Text style={styles.liveConnectText}>Live Connect</Text>
          </Pressable>
        )}

        <Pressable
          testID="header-notifications-btn"
          style={styles.iconBtn}
          onPress={() => router.push('/(tabs)/notifications')}
        >
          <Ionicons name="notifications-outline" size={22} color={THEME.colors.onSurface} />
          {unreadNotifsCount > 0 && (
            <View style={styles.badge} testID="header-notif-badge">
              <Text style={styles.badgeText}>{unreadNotifsCount > 9 ? '9+' : unreadNotifsCount}</Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.divider,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.sm,
  },
  avatarButton: {
    position: 'relative',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: THEME.radius.pill,
    backgroundColor: THEME.colors.surfaceSecondary,
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: THEME.radius.pill,
    backgroundColor: THEME.colors.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.brandPrimary,
  },
  onlineDot: {
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
  appName: {
    fontSize: THEME.typography.scale.lg,
    fontWeight: '800',
    color: THEME.colors.onSurface,
    letterSpacing: -0.3,
  },
  locationTag: {
    fontSize: THEME.typography.scale.xs,
    color: THEME.colors.onSurfaceTertiary,
    fontWeight: '500',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.sm,
  },
  liveConnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.brandPrimary,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 7,
    borderRadius: THEME.radius.pill,
    gap: 6,
    shadowColor: THEME.colors.brandPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  liveConnectText: {
    color: THEME.colors.onBrandPrimary,
    fontSize: THEME.typography.scale.sm,
    fontWeight: '700',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: THEME.radius.pill,
    backgroundColor: THEME.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: THEME.colors.brandPrimary,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
});
