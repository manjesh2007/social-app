import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '@/src/theme';

interface ReportModalProps {
  visible: boolean;
  targetUserName?: string;
  onClose: () => void;
  onSubmit: (reason: string, details: string) => void;
}

const REPORT_REASONS = [
  'Inappropriate or explicit behavior',
  'Underage participant suspected (<18)',
  'Harassment or abusive language',
  'Spam / Commercial solicitation',
  'Camera turned off / Fake identity',
  'Other safety concern',
];

export function ReportModal({ visible, targetUserName, onClose, onSubmit }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>(REPORT_REASONS[0]);
  const [details, setDetails] = useState<string>('');

  const handleSubmit = () => {
    onSubmit(selectedReason, details);
    setDetails('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay} testID="report-safety-modal">
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="shield-half" size={22} color={THEME.colors.error} />
              <Text style={styles.title}>Safety & Moderation</Text>
            </View>
            <Pressable testID="close-report-modal-btn" onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={THEME.colors.onSurface} />
            </Pressable>
          </View>

          <Text style={styles.subtitle}>
            Report {targetUserName || 'this user'} immediately. The live session will disconnect and our safety team will review.
          </Text>

          <Text style={styles.sectionLabel}>Select Reason</Text>
          <View style={styles.reasonsList}>
            {REPORT_REASONS.map((reason, idx) => (
              <Pressable
                key={idx}
                testID={`report-reason-opt-${idx}`}
                style={[styles.reasonOption, selectedReason === reason && styles.selectedReasonOption]}
                onPress={() => setSelectedReason(reason)}
              >
                <Ionicons
                  name={selectedReason === reason ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={selectedReason === reason ? THEME.colors.brandPrimary : THEME.colors.onSurfaceTertiary}
                />
                <Text style={[styles.reasonText, selectedReason === reason && styles.selectedReasonText]}>
                  {reason}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Additional details (optional)</Text>
          <TextInput
            testID="report-details-input"
            style={styles.detailsInput}
            placeholder="Tell us what happened..."
            placeholderTextColor={THEME.colors.tabInactive}
            value={details}
            onChangeText={setDetails}
            multiline
            numberOfLines={3}
          />

          <View style={styles.actionsRow}>
            <Pressable testID="cancel-report-btn" style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable testID="submit-report-btn" style={styles.submitBtn} onPress={handleSubmit}>
              <Ionicons name="warning-outline" size={16} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>Report & Block</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.lg,
  },
  modalCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.radius.lg,
    width: '100%',
    maxWidth: 380,
    padding: THEME.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.xs,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: THEME.typography.scale.lg,
    fontWeight: '800',
    color: THEME.colors.onSurface,
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontSize: 13,
    color: THEME.colors.onSurfaceSecondary,
    marginBottom: THEME.spacing.md,
    lineHeight: 18,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.onSurfaceTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  reasonsList: {
    gap: 6,
    marginBottom: THEME.spacing.md,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: THEME.radius.sm,
    backgroundColor: THEME.colors.surfaceSecondary,
    gap: 10,
  },
  selectedReasonOption: {
    backgroundColor: THEME.colors.brandTertiary,
  },
  reasonText: {
    fontSize: 13,
    color: THEME.colors.onSurfaceSecondary,
    fontWeight: '500',
    flex: 1,
  },
  selectedReasonText: {
    color: THEME.colors.onBrandTertiary,
    fontWeight: '700',
  },
  detailsInput: {
    backgroundColor: THEME.colors.surfaceSecondary,
    borderRadius: THEME.radius.md,
    padding: 10,
    fontSize: 13,
    color: THEME.colors.onSurface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    minHeight: 60,
    textAlignVertical: 'top',
    marginBottom: THEME.spacing.lg,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: THEME.radius.pill,
    backgroundColor: THEME.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.onSurfaceSecondary,
  },
  submitBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: THEME.radius.pill,
    backgroundColor: THEME.colors.error,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
