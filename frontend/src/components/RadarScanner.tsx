import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { THEME } from '@/src/theme';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

interface UserMarker {
  id: string;
  name: string;
  avatar?: string;
  distance_km: number;
}

interface RadarScannerProps {
  users: UserMarker[];
  radiusKm: number;
  onUserSelect?: (user: UserMarker) => void;
}

const RADAR_SIZE = 260;

export function RadarScanner({ users, radiusKm, onUserSelect }: RadarScannerProps) {
  const pulse1 = useSharedValue(0.2);
  const pulse2 = useSharedValue(0.2);
  const rotate = useSharedValue(0);

  useEffect(() => {
    // Pulsing circles
    pulse1.value = withRepeat(
      withTiming(1, { duration: 2500, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );

    pulse2.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 600 }),
        withTiming(1, { duration: 2500, easing: Easing.out(Easing.ease) })
      ),
      -1,
      false
    );

    // Continuous sweep rotation
    rotate.value = withRepeat(
      withTiming(360, { duration: 4000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const pulseStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: pulse1.value }],
    opacity: 1 - pulse1.value,
  }));

  const pulseStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: pulse2.value }],
    opacity: 1 - pulse2.value,
  }));

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
  }));

  // Calculate simulated radar coordinate offsets for users
  const getCoordinates = (index: number, total: number, distKm: number) => {
    const angle = (index / Math.max(total, 1)) * 2 * Math.PI + 0.4;
    const maxR = RADAR_SIZE / 2 - 24;
    const normDist = Math.min(distKm / Math.max(radiusKm, 1), 1);
    const r = 30 + normDist * (maxR - 30);
    const x = RADAR_SIZE / 2 + r * Math.cos(angle) - 16;
    const y = RADAR_SIZE / 2 + r * Math.sin(angle) - 16;
    return { x, y };
  };

  return (
    <View style={styles.radarContainer} testID="radar-scanner-view">
      {/* Background Outer Ring */}
      <View style={styles.radarRingOuter} />
      <View style={styles.radarRingMid} />
      <View style={styles.radarRingInner} />

      {/* Axis lines */}
      <View style={styles.horizontalAxis} />
      <View style={styles.verticalAxis} />

      {/* Animated Pulses */}
      <Animated.View style={[styles.pulseCircle, pulseStyle1]} />
      <Animated.View style={[styles.pulseCircle, pulseStyle2]} />

      {/* Radar Sweep Needle */}
      <Animated.View style={[styles.sweepContainer, sweepStyle]}>
        <View style={styles.sweepLine} />
      </Animated.View>

      {/* Center Me Dot */}
      <View style={styles.centerDot} testID="radar-center-me-marker">
        <Ionicons name="navigate" size={14} color="#FFFFFF" />
      </View>

      {/* Detected User Markers */}
      {users.slice(0, 8).map((u, i) => {
        const coords = getCoordinates(i, Math.min(users.length, 8), u.distance_km);
        return (
          <View
            key={u.id}
            testID={`radar-user-dot-${u.id}`}
            style={[styles.userMarker, { left: coords.x, top: coords.y }]}
          >
            {u.avatar ? (
              <Image source={{ uri: u.avatar }} style={styles.markerAvatar} />
            ) : (
              <View style={styles.markerAvatarFallback}>
                <Text style={styles.markerInitials}>{u.name.slice(0, 1)}</Text>
              </View>
            )}
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceBadgeText}>{u.distance_km}k</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  radarContainer: {
    width: RADAR_SIZE,
    height: RADAR_SIZE,
    borderRadius: RADAR_SIZE / 2,
    backgroundColor: 'rgba(255, 107, 107, 0.04)',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginVertical: THEME.spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 107, 107, 0.2)',
    overflow: 'hidden',
  },
  radarRingOuter: {
    position: 'absolute',
    width: RADAR_SIZE * 0.78,
    height: RADAR_SIZE * 0.78,
    borderRadius: (RADAR_SIZE * 0.78) / 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.15)',
    borderStyle: 'dashed',
  },
  radarRingMid: {
    position: 'absolute',
    width: RADAR_SIZE * 0.52,
    height: RADAR_SIZE * 0.52,
    borderRadius: (RADAR_SIZE * 0.52) / 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.2)',
  },
  radarRingInner: {
    position: 'absolute',
    width: RADAR_SIZE * 0.26,
    height: RADAR_SIZE * 0.26,
    borderRadius: (RADAR_SIZE * 0.26) / 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.25)',
  },
  horizontalAxis: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
  },
  verticalAxis: {
    position: 'absolute',
    height: '100%',
    width: 1,
    backgroundColor: 'rgba(255, 107, 107, 0.12)',
  },
  pulseCircle: {
    position: 'absolute',
    width: RADAR_SIZE,
    height: RADAR_SIZE,
    borderRadius: RADAR_SIZE / 2,
    borderWidth: 2,
    borderColor: THEME.colors.brandPrimary,
  },
  sweepContainer: {
    position: 'absolute',
    width: RADAR_SIZE,
    height: RADAR_SIZE,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  sweepLine: {
    width: 2,
    height: RADAR_SIZE / 2,
    backgroundColor: THEME.colors.brandPrimary,
    opacity: 0.6,
  },
  centerDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: THEME.colors.brandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.colors.brandPrimary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  userMarker: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 8,
  },
  markerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: THEME.colors.brandSecondary,
  },
  markerAvatarFallback: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: THEME.colors.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.colors.brandPrimary,
  },
  markerInitials: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.brandPrimary,
  },
  distanceBadge: {
    position: 'absolute',
    bottom: -6,
    backgroundColor: THEME.colors.surfaceInverse,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  distanceBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
  },
});
