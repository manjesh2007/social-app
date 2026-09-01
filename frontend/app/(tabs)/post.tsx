import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '@/src/theme';
import { api } from '@/src/api/client';
import { useAuth } from '@/src/context/AuthContext';
import { router } from 'expo-router';

const PRESET_IMAGES = [
  'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?w=800',
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800',
  'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800',
  'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800',
];

const SUGGESTED_TAGS = ['LiveConnect', 'NearbyFriends', 'WeekendVibes', 'Coffee', 'Music', 'CityLife'];

export default function PostScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [caption, setCaption] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(PRESET_IMAGES[0]);
  const [locationName, setLocationName] = useState<string>(user?.city || 'Mumbai');
  const [selectedTags, setSelectedTags] = useState<string[]>(['NearbyFriends']);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handlePublish = async () => {
    if (!caption.trim()) {
      return;
    }
    setIsPublishing(true);
    try {
      await api.createPost({
        caption: caption.trim(),
        image_url: selectedImage,
        location_name: locationName,
        tags: selectedTags,
        visibility: 'public',
      });
      setCaption('');
      router.push('/(tabs)');
    } catch (e: any) {
      console.log('Error publishing post:', e);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <ScrollView
      style={[styles.screen, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      testID="create-post-screen"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title} testID="create-post-title">Create Post</Text>
        <Pressable
          testID="publish-post-btn"
          style={[styles.publishBtn, (!caption.trim() || isPublishing) && styles.publishBtnDisabled]}
          disabled={!caption.trim() || isPublishing}
          onPress={handlePublish}
        >
          <Text style={styles.publishBtnText}>
            {isPublishing ? 'Sharing...' : 'Publish'}
          </Text>
        </Pressable>
      </View>

      {/* User Info Bar */}
      <View style={styles.userRow}>
        <Image
          source={{ uri: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500' }}
          style={styles.avatar}
        />
        <View>
          <Text style={styles.userName}>{user?.name || 'You'}</Text>
          <View style={styles.locationTag}>
            <Ionicons name="location-outline" size={12} color={THEME.colors.brandPrimary} />
            <Text style={styles.locationText}>{locationName}</Text>
          </View>
        </View>
      </View>

      {/* Caption Text Input */}
      <TextInput
        testID="post-caption-input"
        style={styles.captionInput}
        placeholder="What's happening nearby? Share a thought, invite friends for coffee, or talk about Live Connect..."
        placeholderTextColor={THEME.colors.tabInactive}
        value={caption}
        onChangeText={setCaption}
        multiline
        numberOfLines={4}
      />

      {/* Photo Selector */}
      <Text style={styles.sectionTitle}>Attach Photo</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetImagesRow}>
        <Pressable
          testID="remove-image-btn"
          style={[styles.presetThumb, selectedImage === null && styles.presetThumbSelected]}
          onPress={() => setSelectedImage(null)}
        >
          <Ionicons name="close-circle-outline" size={24} color={THEME.colors.onSurfaceTertiary} />
          <Text style={styles.noImageText}>No Photo</Text>
        </Pressable>

        {PRESET_IMAGES.map((imgUrl, idx) => (
          <Pressable
            key={idx}
            testID={`preset-img-${idx}`}
            style={[styles.presetThumb, selectedImage === imgUrl && styles.presetThumbSelected]}
            onPress={() => setSelectedImage(imgUrl)}
          >
            <Image source={{ uri: imgUrl }} style={styles.presetThumbImage} contentFit="cover" />
            {selectedImage === imgUrl && (
              <View style={styles.checkOverlay}>
                <Ionicons name="checkmark-circle" size={22} color={THEME.colors.brandPrimary} />
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>

      {/* Location Input */}
      <Text style={styles.sectionTitle}>Location Tag</Text>
      <View style={styles.locationInputRow}>
        <Ionicons name="map-outline" size={18} color={THEME.colors.brandPrimary} />
        <TextInput
          testID="post-location-input"
          style={styles.locationInput}
          placeholder="Add location (e.g., Bandra West, Mumbai)"
          placeholderTextColor={THEME.colors.tabInactive}
          value={locationName}
          onChangeText={setLocationName}
        />
      </View>

      {/* Tags Selector */}
      <Text style={styles.sectionTitle}>Add Topic Tags</Text>
      <View style={styles.tagsContainer}>
        {SUGGESTED_TAGS.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <Pressable
              key={tag}
              testID={`tag-chip-${tag}`}
              style={[styles.tagChip, isSelected && styles.tagChipSelected]}
              onPress={() => toggleTag(tag)}
            >
              <Text style={[styles.tagChipText, isSelected && styles.tagChipTextSelected]}>
                #{tag}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
  },
  content: {
    paddingHorizontal: THEME.spacing.lg,
    paddingBottom: 60,
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
  title: {
    fontSize: THEME.typography.scale.xl,
    fontWeight: '800',
    color: THEME.colors.onSurface,
  },
  publishBtn: {
    backgroundColor: THEME.colors.brandPrimary,
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: 8,
    borderRadius: THEME.radius.pill,
  },
  publishBtnDisabled: {
    opacity: 0.5,
  },
  publishBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: THEME.spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  userName: {
    fontSize: THEME.typography.scale.base,
    fontWeight: '700',
    color: THEME.colors.onSurface,
  },
  locationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  locationText: {
    fontSize: 12,
    color: THEME.colors.onSurfaceSecondary,
  },
  captionInput: {
    backgroundColor: THEME.colors.surfaceSecondary,
    borderRadius: THEME.radius.md,
    padding: THEME.spacing.md,
    fontSize: 15,
    color: THEME.colors.onSurface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    minHeight: 110,
    textAlignVertical: 'top',
    marginBottom: THEME.spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.colors.onSurfaceTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  presetImagesRow: {
    gap: 10,
    marginBottom: THEME.spacing.lg,
  },
  presetThumb: {
    width: 80,
    height: 80,
    borderRadius: THEME.radius.md,
    overflow: 'hidden',
    backgroundColor: THEME.colors.surfaceSecondary,
    borderWidth: 2,
    borderColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  presetThumbSelected: {
    borderColor: THEME.colors.brandPrimary,
  },
  presetThumbImage: {
    width: '100%',
    height: '100%',
  },
  noImageText: {
    fontSize: 10,
    color: THEME.colors.onSurfaceTertiary,
    marginTop: 4,
    fontWeight: '600',
  },
  checkOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  locationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceSecondary,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 10,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    gap: 8,
    marginBottom: THEME.spacing.lg,
  },
  locationInput: {
    flex: 1,
    fontSize: 14,
    color: THEME.colors.onSurface,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: THEME.radius.pill,
    backgroundColor: THEME.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  tagChipSelected: {
    backgroundColor: THEME.colors.brandTertiary,
    borderColor: THEME.colors.brandPrimary,
  },
  tagChipText: {
    fontSize: 13,
    color: THEME.colors.onSurfaceSecondary,
    fontWeight: '600',
  },
  tagChipTextSelected: {
    color: THEME.colors.onBrandTertiary,
    fontWeight: '700',
  },
});
