import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '@/src/theme';
import { api } from '@/src/api/client';
import { RadarScanner } from '@/src/components/RadarScanner';
import { EmptyState } from '@/src/components/EmptyState';
import { LoadingSkeleton } from '@/src/components/LoadingSkeleton';
import { router, useFocusEffect } from 'expo-router';

const RADIUS_OPTIONS = [5, 10, 25, 50];
const GENDER_FILTERS = ['All', 'Female', 'Male', 'Non-binary'];

export default function NearbyScreen() {
  const insets = useSafeAreaInsets();
  const [selectedRadius, setSelectedRadius] = useState<number>(25);
  const [selectedGender, setSelectedGender] = useState<string>('All');
  const [nearbyUsers, setNearbyUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [sentRequests, setSentRequests] = useState<Record<string, boolean>>({});

  const loadNearby = async () => {
    try {
      const users = await api.getNearbyUsers({
        radius_km: selectedRadius,
        gender: selectedGender,
      });
      setNearbyUsers(users);
    } catch (e) {
      console.log('Error loading nearby users:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadNearby();
    }, [selectedRadius, selectedGender])
  );

  useEffect(() => {
    loadNearby();
  }, [selectedRadius, selectedGender]);

  const handleSendRequest = async (userId: string) => {
    try {
      setSentRequests((prev) => ({ ...prev, [userId]: true }));
      await api.sendFriendRequest(userId);
    } catch (e) {
      console.log('Error sending friend request:', e);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]} testID="nearby-radar-screen">
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title} testID="nearby-screen-title">Nearby Radar</Text>
          <Text style={styles.subtitle}>Discover people around your location</Text>
        </View>

        <Pressable
          testID="start-live-connect-radar-btn"
          style={styles.liveMatchBtn}
          onPress={() => router.push('/live-connect')}
        >
          <Ionicons name="videocam" size={16} color="#FFFFFF" />
          <Text style={styles.liveMatchText}>Live Match</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              loadNearby();
            }}
          />
        }
      >
        {/* Radar Visual */}
        <RadarScanner
          users={nearbyUsers.map((u) => ({
            id: u.id,
            name: u.name,
            avatar: u.avatar,
            distance_km: u.distance_km,
          }))}
          radiusKm={selectedRadius}
        />

        {/* Distance Filter Chips */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Search Radius: {selectedRadius} km</Text>
          <View style={styles.chipsRow}>
            {RADIUS_OPTIONS.map((r) => (
              <Pressable
                key={r}
                testID={`radius-chip-${r}km`}
                style={[styles.chip, selectedRadius === r && styles.chipSelected]}
                onPress={() => setSelectedRadius(r)}
              >
                <Text style={[styles.chipText, selectedRadius === r && styles.chipTextSelected]}>
                  {r} km
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Gender Filter Chips */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Filter by Community</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genderRow}>
            {GENDER_FILTERS.map((g) => (
              <Pressable
                key={g}
                testID={`gender-chip-${g}`}
                style={[styles.chip, selectedGender === g && styles.chipSelected]}
                onPress={() => setSelectedGender(g)}
              >
                <Text style={[styles.chipText, selectedGender === g && styles.chipTextSelected]}>
                  {g}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Nearby People List */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.listTitle}>People Within Range ({nearbyUsers.length})</Text>
        </View>

        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <View style={styles.usersList}>
            {nearbyUsers.map((u) => {
              const hasSent = sentRequests[u.id] || u.friend_status === 'pending';
              const isFriend = u.friend_status === 'accepted';

              return (
                <View key={u.id} style={styles.userCard} testID={`nearby-user-card-${u.id}`}>
                  <Image
                    source={{ uri: u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500' }}
                    style={styles.avatar}
                  />

                  <View style={styles.userInfo}>
                    <View style={styles.userNameRow}>
                      <Text style={styles.userName}>{u.name}</Text>
                      <View style={styles.distBadge}>
                        <Ionicons name="navigate-outline" size={10} color={THEME.colors.brandPrimary} />
                        <Text style={styles.distBadgeText}>{u.distance_km} km away</Text>
                      </View>
                    </View>

                    <Text style={styles.userCity}>{u.city || 'Nearby'} • {u.age || 22} yrs</Text>
                    {u.bio ? <Text style={styles.userBio} numberOfLines={1}>{u.bio}</Text> : null}

                    {u.interests && u.interests.length > 0 && (
                      <View style={styles.interestsRow}>
                        {u.interests.slice(0, 3).map((item: string, idx: number) => (
                          <View key={idx} style={styles.interestTag}>
                            <Text style={styles.interestTagText}>{item}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Actions */}
                  <View style={styles.cardActions}>
                    {isFriend ? (
                      <Pressable
                        testID={`chat-friend-btn-${u.id}`}
                        style={styles.friendBtn}
                        onPress={() => router.push('/(tabs)/friends')}
                      >
                        <Ionicons name="chatbubble" size={14} color="#FFFFFF" />
                        <Text style={styles.actionBtnWhiteText}>Chat</Text>
                      </Pressable>
                    ) : hasSent ? (
                      <View style={styles.requestedBtn} testID={`requested-btn-${u.id}`}>
                        <Ionicons name="time-outline" size={14} color={THEME.colors.onSurfaceTertiary} />
                        <Text style={styles.requestedBtnText}>Sent</Text>
                      </View>
                    ) : (
                      <Pressable
                        testID={`add-friend-btn-${u.id}`}
                        style={styles.addBtn}
                        onPress={() => handleSendRequest(u.id)}
                      >
                        <Ionicons name="person-add" size={14} color="#FFFFFF" />
                        <Text style={styles.actionBtnWhiteText}>Connect</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}

            {nearbyUsers.length === 0 && (
              <EmptyState
                icon="radar-outline"
                title="No One in This Radius"
                description="Try increasing your radar distance or clearing gender filters."
                actionText="Expand to 50 km"
                onAction={() => setSelectedRadius(50)}
                testID="empty-nearby-state"
              />
            )}
          </View>
        )}
      </ScrollView>
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
  subtitle: {
    fontSize: 12,
    color: THEME.colors.onSurfaceSecondary,
  },
  liveMatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.brandPrimary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: THEME.radius.pill,
  },
  liveMatchText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  filterSection: {
    paddingHorizontal: THEME.spacing.lg,
    marginBottom: THEME.spacing.md,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.onSurfaceTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderRow: {
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
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
  listHeaderRow: {
    paddingHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.sm,
    marginBottom: THEME.spacing.sm,
  },
  listTitle: {
    fontSize: THEME.typography.scale.base,
    fontWeight: '800',
    color: THEME.colors.onSurface,
  },
  usersList: {
    paddingHorizontal: THEME.spacing.lg,
    gap: 10,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.cardBackground,
    padding: THEME.spacing.md,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.colors.surfaceSecondary,
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.onSurface,
  },
  distBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: THEME.colors.brandTertiary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: THEME.radius.sm,
  },
  distBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.onBrandTertiary,
  },
  userCity: {
    fontSize: 11,
    color: THEME.colors.onSurfaceTertiary,
    marginBottom: 2,
  },
  userBio: {
    fontSize: 12,
    color: THEME.colors.onSurfaceSecondary,
    marginBottom: 4,
  },
  interestsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  interestTag: {
    backgroundColor: THEME.colors.surfaceSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  interestTagText: {
    fontSize: 10,
    color: THEME.colors.onSurfaceTertiary,
    fontWeight: '500',
  },
  cardActions: {
    alignItems: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.brandPrimary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radius.pill,
  },
  friendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.radius.pill,
  },
  actionBtnWhiteText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  requestedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.radius.pill,
  },
  requestedBtnText: {
    color: THEME.colors.onSurfaceTertiary,
    fontSize: 11,
    fontWeight: '600',
  },
});
