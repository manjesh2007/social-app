import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '@/src/theme';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  testID?: string;
}

export function EmptyState({
  icon = 'albums-outline',
  title,
  description,
  actionText,
  onAction,
  testID = 'empty-state-view',
}: EmptyStateProps) {
  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={36} color={THEME.colors.brandPrimary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionText && onAction && (
        <Pressable
          testID={`${testID}-action-btn`}
          style={styles.actionBtn}
          onPress={onAction}
        >
          <Text style={styles.actionBtnText}>{actionText}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: THEME.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: THEME.spacing.lg,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: THEME.colors.brandTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.spacing.md,
  },
  title: {
    fontSize: THEME.typography.scale.lg,
    fontWeight: '700',
    color: THEME.colors.onSurface,
    textAlign: 'center',
    marginBottom: THEME.spacing.xs,
  },
  description: {
    fontSize: THEME.typography.scale.base,
    color: THEME.colors.onSurfaceSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
    marginBottom: THEME.spacing.md,
  },
  actionBtn: {
    backgroundColor: THEME.colors.brandPrimary,
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: 10,
    borderRadius: THEME.radius.pill,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
