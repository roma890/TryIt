import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { FoodPost } from '../../types';
import { socialService } from '../../services/firebase/social.service';

const { width } = Dimensions.get('window');

interface SocialFeedScreenProps {
  userId: string;
  navigation: any;
}

export const SocialFeedScreen: React.FC<SocialFeedScreenProps> = ({
  userId,
  navigation,
}) => {
  const [posts, setPosts] = useState<FoodPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const feedPosts = await socialService.getFeedPosts(userId);
      setPosts(feedPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPosts();
  };

  const handleLike = async (postId: string, isLiked: boolean) => {
    try {
      if (isLiked) {
        await socialService.unlikePost(postId, userId);
      } else {
        await socialService.likePost(postId, userId);
      }
      // Update local state
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                likes: isLiked
                  ? post.likes.filter((id) => id !== userId)
                  : [...post.likes, userId],
              }
            : post
        )
      );
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const renderPost = ({ item: post }: { item: FoodPost }) => {
    const isLiked = post.likes.includes(userId);
    const likeCount = post.likes.length;

    return (
      <View style={styles.postCard}>
        {/* Post Header */}
        <View style={styles.postHeader}>
          <TouchableOpacity
            style={styles.userInfo}
            onPress={() =>
              navigation.navigate('UserProfile', { userId: post.userId })
            }
          >
            <Image
              source={{
                uri: post.userPhotoURL || 'https://via.placeholder.com/40',
              }}
              style={styles.avatar}
            />
            <View>
              <Text style={styles.userName}>{post.userName}</Text>
              <Text style={styles.restaurantName}>{post.restaurantName}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Post Image */}
        {post.images && post.images.length > 0 && (
          <Image
            source={{ uri: post.images[0] }}
            style={styles.postImage}
            resizeMode="cover"
          />
        )}

        {/* Post Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLike(post.id, isLiked)}
          >
            <Text style={styles.actionIcon}>{isLiked ? '❤️' : '🤍'}</Text>
            <Text style={styles.actionText}>
              {likeCount} {likeCount === 1 ? 'like' : 'likes'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionText}>
              {post.comments.length} {post.comments.length === 1 ? 'comment' : 'comments'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Post Caption & Rating */}
        {post.rating && (
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingText}>
              ⭐ {post.rating.toFixed(1)}/5
            </Text>
          </View>
        )}

        {post.caption && (
          <View style={styles.captionContainer}>
            <Text style={styles.captionUserName}>{post.userName}</Text>
            <Text style={styles.captionText}>{post.caption}</Text>
          </View>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {post.tags.map((tag, index) => (
              <Text key={index} style={styles.tag}>
                #{tag}
              </Text>
            ))}
          </View>
        )}

        {/* Timestamp */}
        <Text style={styles.timestamp}>
          {formatTimestamp(post.createdAt)}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Feed</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('CreatePost')}
        >
          <Text style={styles.createButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No posts yet</Text>
            <Text style={styles.emptySubtext}>
              Follow friends to see their food adventures!
            </Text>
          </View>
        }
      />
    </View>
  );
};

const formatTimestamp = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
  listContent: {
    paddingBottom: 20,
  },
  postCard: {
    backgroundColor: '#fff',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  postHeader: {
    padding: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  restaurantName: {
    fontSize: 14,
    color: '#666',
  },
  postImage: {
    width: width,
    height: width,
    backgroundColor: '#f0f0f0',
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionText: {
    fontSize: 14,
    color: '#666',
  },
  ratingContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  captionContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    gap: 5,
  },
  captionUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  captionText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 8,
  },
  tag: {
    fontSize: 14,
    color: '#2196F3',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
