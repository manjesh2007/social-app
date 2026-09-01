import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '@/src/theme';
import { useAuth } from '@/src/context/AuthContext';
import { router } from 'expo-router';

interface Story {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  media_url: string;
  caption?: string;
  created_at: string;
}

interface StoryRailProps {
  stories: Story[];
}

export function StoryRail({ stories }: StoryRailProps) {
  const { user } = useAuth();
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);

  return (
    <View style={styles.container} testID="story-rail-container">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* User's Add Story bubble */}
        <Pressable
          testID="add-story-btn"
          style={styles.storyItem}
          onPress={() => router.push('/(tabs)/post')}
        >
          <View style={styles.myAvatarWrapper}>
            <Image
              source={{ uri: user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500' }}
              style={styles.avatarImage}
              contentFit="cover"
            />
            <View style={styles.addPlusBadge}>
              <Ionicons name="add" size={14} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.userName} numberOfLines={1}>Your Story</Text>
        </Pressable>

        {/* Stories from others */}
        {stories.map((story) => (
          <Pressable
            key={story.id}
            testID={`story-item-${story.id}`}
            style={styles.storyItem}
            onPress={() => setSelectedStory(story)}
          >
            <View style={styles.storyRing}>
              <Image
                source={{ uri: story.user_avatar }}
                style={styles.avatarImage}
                contentFit="cover"
              />
            </View>
            <Text style={styles.userName} numberOfLines={1}>{story.user_name.split(' ')[0]}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Story Viewer Modal */}
      {selectedStory && (
        <Modal
          visible={!!selectedStory}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedStory(null)}
        >
          <View style={styles.modalBackdrop} testID="story-viewer-modal">
            <View style={styles.storyModalCard}>
              <Image
                source={{ uri: selectedStory.media_url }}
                style={styles.storyMedia}
                contentFit="cover"
              />
              <View style={styles.storyHeader}>
                <View style={styles.storyUserInfo}>
                  <Image source={{ uri: selectedStory.user_avatar }} style={styles.storyUserAvatar} />
                  <Text style={styles.storyUserName}>{selectedStory.user_name}</Text>
                </View>
                <Pressable
                  testID="close-story-btn"
                  style={styles.closeBtn}
                  onPress={() => setSelectedStory(null)}
                >
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </Pressable>
              </View>
              {selectedStory.caption && (
                <View style={styles.storyCaptionBadge}>
                  <Text style={styles.storyCaptionText}>{selectedStory.caption}</Text>
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: THEME.spacing.sm,
    backgroundColor: THEME.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.divider,
  },
  scrollContent: {
    paddingHorizontal: THEME.spacing.lg,
    gap: THEME.spacing.md,
    alignItems: 'center',
  },
  storyItem: {
    alignItems: 'center',
    width: 68,
  },
  myAvatarWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    padding: 2,
    borderWidth: 2,
    borderColor: THEME.colors.border,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    padding: 2,
    borderWidth: 2.5,
    borderColor: THEME.colors.brandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  addPlusBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: THEME.colors.brandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.colors.surface,
  },
  userName: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.onSurfaceSecondary,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyModalCard: {
    width: '94%',
    height: '82%',
    borderRadius: THEME.radius.lg,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000000',
  },
  storyMedia: {
    width: '100%',
    height: '100%',
  },
  storyHeader: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  storyUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  storyUserAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  storyUserName: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyCaptionBadge: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.65)',
    padding: 14,
    borderRadius: THEME.radius.md,
  },
  storyCaptionText: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
});
