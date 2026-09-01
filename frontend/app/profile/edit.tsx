import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '@/src/theme';
import { useAuth } from '@/src/context/AuthContext';
import { api } from '@/src/api/client';
import { router } from 'expo-router';

const AVATAR_OPTIONS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500',
];

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();

  const [name, setName] = useState<string>(user?.name || '');
  const [city, setCity] = useState<string>(user?.city || '');
  const [bio, setBio] = useState<string>(user?.bio || '');
  const [avatar, setAvatar] = useState<string>(user?.avatar || AVATAR_OPTIONS[0]);
  const [interestsText, setInterestsText] = useState<string>((user?.interests || []).join(', '));
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const interestsArray = interestsText
        .split(',')
        .map((i) => i.trim())
        .filter(Boolean);

      const updated = await api.updateProfile({
        name: name.trim(),
        city: city.trim(),
        bio: bio.trim(),
        avatar,
        interests: interestsArray,
      });

      updateUser(updated);
      router.back();
    } catch (e) {
      console.log('Error updating profile:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScrollView
      style={[styles.screen, { paddingTop: insets.top }]}
      contentContainerStyle={styles.scrollContent}
      testID="edit-profile-screen"
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable testID="edit-profile-cancel-btn" onPress={() => router.back()} style={styles.cancelBtn}>
          <Ionicons name="close" size={24} color={THEME.colors.onSurface} />
        </Pressable>
        <Text style={styles.title} testID="edit-profile-title">Edit Profile</Text>
        <Pressable
          testID="save-profile-btn"
          style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={styles.saveBtnText}>{isSaving ? 'Saving...' : 'Save'}</Text>
        </Pressable>
      </View>

      {/* Avatar Picker */}
      <Text style={styles.sectionTitle}>Choose Avatar</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarRow}>
        {AVATAR_OPTIONS.map((imgUrl, idx) => (
          <Pressable
            key={idx}
            testID={`avatar-opt-${idx}`}
            style={[styles.avatarOption, avatar === imgUrl && styles.avatarOptionSelected]}
            onPress={() => setAvatar(imgUrl)}
          >
            <Image source={{ uri: imgUrl }} style={styles.avatarImg} />
            {avatar === imgUrl && (
              <View style={styles.avatarCheck}>
                <Ionicons name="checkmark-circle" size={20} color={THEME.colors.brandPrimary} />
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>

      {/* Inputs */}
      <View style={styles.formSection}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          testID="edit-name-input"
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your full name"
          placeholderTextColor={THEME.colors.tabInactive}
        />

        <Text style={styles.label}>City / Location</Text>
        <TextInput
          testID="edit-city-input"
          style={styles.input}
          value={city}
          onChangeText={setCity}
          placeholder="Your city"
          placeholderTextColor={THEME.colors.tabInactive}
        />

        <Text style={styles.label}>Bio</Text>
        <TextInput
          testID="edit-bio-input"
          style={[styles.input, styles.bioInput]}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell others about yourself..."
          placeholderTextColor={THEME.colors.tabInactive}
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Interests (comma separated)</Text>
        <TextInput
          testID="edit-interests-input"
          style={styles.input}
          value={interestsText}
          onChangeText={setInterestsText}
          placeholder="e.g. Photography, Music, Travel, Coffee"
          placeholderTextColor={THEME.colors.tabInactive}
        />
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
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.divider,
    marginBottom: THEME.spacing.md,
  },
  cancelBtn: {
    padding: 4,
  },
  title: {
    fontSize: THEME.typography.scale.lg,
    fontWeight: '800',
    color: THEME.colors.onSurface,
  },
  saveBtn: {
    backgroundColor: THEME.colors.brandPrimary,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: THEME.radius.pill,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.onSurfaceTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  avatarRow: {
    gap: 12,
    marginBottom: THEME.spacing.lg,
  },
  avatarOption: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: THEME.colors.border,
    position: 'relative',
  },
  avatarOptionSelected: {
    borderColor: THEME.colors.brandPrimary,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
  },
  avatarCheck: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  formSection: {
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.onSurface,
    marginBottom: -4,
  },
  input: {
    backgroundColor: THEME.colors.surfaceSecondary,
    borderRadius: THEME.radius.md,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 12,
    fontSize: 14,
    color: THEME.colors.onSurface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
