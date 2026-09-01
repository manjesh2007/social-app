import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Modal, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '@/src/theme';
import { api } from '@/src/api/client';
import { useAuth } from '@/src/context/AuthContext';

interface Comment {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  text: string;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  user_city?: string;
  caption: string;
  image_url?: string;
  location_name?: string;
  tags?: string[];
  likes_count: number;
  is_liked: boolean;
  comments: Comment[];
  created_at: string;
}

interface PostCardProps {
  post: Post;
  onUpdate?: () => void;
}

export function PostCard({ post, onUpdate }: PostCardProps) {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState<boolean>(post.is_liked);
  const [likesCount, setLikesCount] = useState<number>(post.likes_count || 0);
  const [comments, setComments] = useState<Comment[]>(post.comments || []);
  const [showCommentsModal, setShowCommentsModal] = useState<boolean>(false);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);

  const handleLike = async () => {
    // Optimistic update
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikesCount(prev => nextLiked ? prev + 1 : Math.max(0, prev - 1));

    try {
      const res = await api.likePost(post.id);
      setIsLiked(res.is_liked);
      setLikesCount(res.likes_count);
    } catch (e) {
      // Revert on error
      setIsLiked(isLiked);
      setLikesCount(likesCount);
    }
  };

  const handleAddComment = async () => {
    if (!newCommentText.trim()) return;
    setIsSubmittingComment(true);
    try {
      const addedComment = await api.commentPost(post.id, newCommentText.trim());
      setComments(prev => [...prev, addedComment]);
      setNewCommentText('');
      if (onUpdate) onUpdate();
    } catch (e) {
      console.log('Error adding comment:', e);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <View style={styles.cardContainer} testID={`post-card-${post.id}`}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Image
            source={{ uri: post.user_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500' }}
            style={styles.avatar}
            contentFit="cover"
          />
          <View>
            <Text style={styles.authorName}>{post.user_name}</Text>
            <Text style={styles.locationSubText}>
              {post.location_name || post.user_city || 'Nearby'}
            </Text>
          </View>
        </View>

        <Pressable testID={`post-options-btn-${post.id}`} style={styles.moreBtn}>
          <Ionicons name="ellipsis-horizontal" size={18} color={THEME.colors.onSurfaceTertiary} />
        </Pressable>
      </View>

      {/* Caption */}
      <Text style={styles.captionText}>{post.caption}</Text>

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {post.tags.map((tag, idx) => (
            <View key={idx} style={styles.tagBadge}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Image Preview */}
      {post.image_url && (
        <View style={styles.mediaContainer}>
          <Image
            source={{ uri: post.image_url }}
            style={styles.postImage}
            contentFit="cover"
          />
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsRow}>
        <View style={styles.leftActions}>
          <Pressable
            testID={`like-post-btn-${post.id}`}
            style={[styles.actionBtn, isLiked && styles.likedActionBtn]}
            onPress={handleLike}
          >
            <Ionicons
              name={isLiked ? "heart" : "heart-outline"}
              size={20}
              color={isLiked ? THEME.colors.brandPrimary : THEME.colors.onSurfaceSecondary}
            />
            <Text style={[styles.actionCount, isLiked && styles.likedCountText]}>
              {likesCount}
            </Text>
          </Pressable>

          <Pressable
            testID={`comment-post-btn-${post.id}`}
            style={styles.actionBtn}
            onPress={() => setShowCommentsModal(true)}
          >
            <Ionicons name="chatbubble-outline" size={18} color={THEME.colors.onSurfaceSecondary} />
            <Text style={styles.actionCount}>{comments.length}</Text>
          </Pressable>
        </View>

        <Pressable
          testID={`share-post-btn-${post.id}`}
          style={styles.actionBtn}
          onPress={() => {}}
        >
          <Ionicons name="paper-plane-outline" size={18} color={THEME.colors.onSurfaceSecondary} />
        </Pressable>
      </View>

      {/* Comments Modal */}
      <Modal
        visible={showCommentsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCommentsModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.commentsSheet} testID="comments-modal">
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Comments ({comments.length})</Text>
              <Pressable
                testID="close-comments-btn"
                onPress={() => setShowCommentsModal(false)}
                style={styles.closeSheetBtn}
              >
                <Ionicons name="close" size={20} color={THEME.colors.onSurface} />
              </Pressable>
            </View>

            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.commentsList}
              renderItem={({ item }) => (
                <View style={styles.commentRow} testID={`comment-item-${item.id}`}>
                  <Image
                    source={{ uri: item.user_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500' }}
                    style={styles.commentAvatar}
                  />
                  <View style={styles.commentBubble}>
                    <Text style={styles.commentAuthor}>{item.user_name}</Text>
                    <Text style={styles.commentContent}>{item.text}</Text>
                  </View>
                </View>
              )}
              ListEmptyState={() => (
                <View style={styles.emptyComments}>
                  <Text style={styles.emptyCommentsText}>No comments yet. Be the first to chime in!</Text>
                </View>
              )}
            />

            {/* Input Row */}
            <View style={styles.commentInputRow}>
              <TextInput
                testID="new-comment-input"
                style={styles.commentInput}
                placeholder="Write a comment..."
                placeholderTextColor={THEME.colors.tabInactive}
                value={newCommentText}
                onChangeText={setNewCommentText}
              />
              <Pressable
                testID="submit-comment-btn"
                style={[styles.sendCommentBtn, !newCommentText.trim() && styles.sendCommentBtnDisabled]}
                disabled={!newCommentText.trim() || isSubmittingComment}
                onPress={handleAddComment}
              >
                <Ionicons name="send" size={16} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: THEME.colors.cardBackground,
    marginHorizontal: THEME.spacing.lg,
    marginVertical: THEME.spacing.sm,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.surfaceSecondary,
  },
  authorName: {
    fontSize: THEME.typography.scale.base,
    fontWeight: '700',
    color: THEME.colors.onSurface,
  },
  locationSubText: {
    fontSize: THEME.typography.scale.xs,
    color: THEME.colors.onSurfaceTertiary,
  },
  moreBtn: {
    padding: 6,
  },
  captionText: {
    fontSize: THEME.typography.scale.base,
    color: THEME.colors.onSurfaceSecondary,
    lineHeight: 21,
    marginBottom: THEME.spacing.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: THEME.spacing.sm,
  },
  tagBadge: {
    backgroundColor: THEME.colors.brandTertiary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.radius.sm,
  },
  tagText: {
    color: THEME.colors.onBrandTertiary,
    fontSize: 12,
    fontWeight: '600',
  },
  mediaContainer: {
    borderRadius: THEME.radius.md,
    overflow: 'hidden',
    height: 220,
    marginBottom: THEME.spacing.sm,
    backgroundColor: THEME.colors.surfaceSecondary,
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: THEME.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.divider,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.md,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: THEME.radius.sm,
  },
  likedActionBtn: {
    backgroundColor: THEME.colors.brandTertiary,
  },
  actionCount: {
    fontSize: THEME.typography.scale.sm,
    fontWeight: '600',
    color: THEME.colors.onSurfaceSecondary,
  },
  likedCountText: {
    color: THEME.colors.brandPrimary,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  commentsSheet: {
    backgroundColor: THEME.colors.surface,
    borderTopLeftRadius: THEME.radius.lg,
    borderTopRightRadius: THEME.radius.lg,
    maxHeight: '75%',
    paddingBottom: 24,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.colors.borderStrong,
    alignSelf: 'center',
    marginTop: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.divider,
  },
  sheetTitle: {
    fontSize: THEME.typography.scale.lg,
    fontWeight: '700',
    color: THEME.colors.onSurface,
  },
  closeSheetBtn: {
    padding: 4,
  },
  commentsList: {
    padding: THEME.spacing.lg,
    gap: THEME.spacing.md,
  },
  commentRow: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentBubble: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceSecondary,
    padding: THEME.spacing.sm,
    borderRadius: THEME.radius.md,
  },
  commentAuthor: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.onSurface,
    marginBottom: 2,
  },
  commentContent: {
    fontSize: 13,
    color: THEME.colors.onSurfaceSecondary,
  },
  emptyComments: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyCommentsText: {
    color: THEME.colors.onSurfaceTertiary,
    fontSize: 13,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.lg,
    paddingTop: THEME.spacing.sm,
    gap: THEME.spacing.sm,
  },
  commentInput: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceSecondary,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 10,
    borderRadius: THEME.radius.pill,
    fontSize: 14,
    color: THEME.colors.onSurface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  sendCommentBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.brandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendCommentBtnDisabled: {
    opacity: 0.5,
  },
});
