import React from 'react';
import { View, StyleSheet } from 'react-native';
import { THEME } from '@/src/theme';

export function LoadingSkeleton() {
  return (
    <View style={styles.skeletonCard} testID="loading-skeleton-view">
      <View style={styles.headerRow}>
        <View style={styles.avatarBone} />
        <View style={styles.metaCol}>
          <View style={styles.titleBone} />
          <View style={styles.subTitleBone} />
        </View>
      </View>
      <View style={styles.bodyBone1} />
      <View style={styles.bodyBone2} />
      <View style={styles.mediaBone} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonCard: {
    backgroundColor: THEME.colors.surfaceSecondary,
    marginHorizontal: THEME.spacing.lg,
    marginVertical: THEME.spacing.sm,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.md,
    opacity: 0.7,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatarBone: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.surfaceTertiary,
  },
  metaCol: {
    gap: 6,
  },
  titleBone: {
    width: 120,
    height: 14,
    borderRadius: 4,
    backgroundColor: THEME.colors.surfaceTertiary,
  },
  subTitleBone: {
    width: 80,
    height: 10,
    borderRadius: 4,
    backgroundColor: THEME.colors.surfaceTertiary,
  },
  bodyBone1: {
    width: '90%',
    height: 12,
    borderRadius: 4,
    backgroundColor: THEME.colors.surfaceTertiary,
    marginBottom: 6,
  },
  bodyBone2: {
    width: '60%',
    height: 12,
    borderRadius: 4,
    backgroundColor: THEME.colors.surfaceTertiary,
    marginBottom: 12,
  },
  mediaBone: {
    width: '100%',
    height: 180,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.surfaceTertiary,
  },
});
