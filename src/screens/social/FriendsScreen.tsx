import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { authService } from '../../services/firebase/auth.service';
import { friendsService, FriendSuggestion } from '../../services/firebase/friends.service';
import { User } from '../../types';
import { Colors } from '../../constants/colors';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '../../services/firebase/config';

interface FriendsScreenProps {
  navigation: any;
  userId: string;
}

interface FriendUser {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

export const FriendsScreen: React.FC<FriendsScreenProps> = ({
  navigation,
  userId,
}) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'search' | 'suggestions'>('friends');
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [friendRequests, setFriendRequests] = useState<FriendUser[]>([]);
  const [suggestions, setSuggestions] = useState<FriendSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    loadFriends();
    loadFriendRequests();
    loadSuggestions();
  }, []);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const userDoc = await getDoc(doc(db, 'users', userId));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const friendIds = userData.friends || [];

        if (friendIds.length === 0) {
          setFriends([]);
          setLoading(false);
          return;
        }

        // Fetch friend details
        const friendsData: FriendUser[] = [];
        for (const friendId of friendIds) {
          const friendDoc = await getDoc(doc(db, 'users', friendId));
          if (friendDoc.exists()) {
            friendsData.push({
              id: friendDoc.id,
              displayName: friendDoc.data().displayName || 'Unknown',
              email: friendDoc.data().email || '',
              photoURL: friendDoc.data().photoURL,
            });
          }
        }

        setFriends(friendsData);
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFriendRequests = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const requestIds = userData.friendRequests || [];

        if (requestIds.length === 0) {
          setFriendRequests([]);
          return;
        }

        // Fetch friend request details
        const requestsData: FriendUser[] = [];
        for (const requestId of requestIds) {
          const requestDoc = await getDoc(doc(db, 'users', requestId));
          if (requestDoc.exists()) {
            requestsData.push({
              id: requestDoc.id,
              displayName: requestDoc.data().displayName || 'Unknown',
              email: requestDoc.data().email || '',
              photoURL: requestDoc.data().photoURL,
            });
          }
        }

        setFriendRequests(requestsData);
      }
    } catch (error) {
      console.error('Error loading friend requests:', error);
    }
  };

  const loadSuggestions = async () => {
    try {
      setLoadingSuggestions(true);
      const suggestionsData = await friendsService.getFriendSuggestionsOptimized(userId, 10);
      setSuggestions(suggestionsData);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);

      // Search by email
      const q = query(
        collection(db, 'users'),
        where('email', '>=', searchQuery.toLowerCase()),
        where('email', '<=', searchQuery.toLowerCase() + '\uf8ff')
      );

      const querySnapshot = await getDocs(q);
      const results: FriendUser[] = [];

      querySnapshot.forEach((doc) => {
        if (doc.id !== userId) {
          // Don't include current user
          results.push({
            id: doc.id,
            displayName: doc.data().displayName || 'Unknown',
            email: doc.data().email || '',
            photoURL: doc.data().photoURL,
          });
        }
      });

      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('Error', 'Failed to search users. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleAddFriend = async (friendId: string) => {
    try {
      // Add friend request to the other user
      await updateDoc(doc(db, 'users', friendId), {
        friendRequests: arrayUnion(userId),
      });

      Alert.alert('Success', 'Friend request sent!');
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Error', 'Failed to send friend request. Please try again.');
    }
  };

  const handleAcceptFriendRequest = async (friendId: string) => {
    try {
      // Add to both users' friend lists
      await updateDoc(doc(db, 'users', userId), {
        friends: arrayUnion(friendId),
        friendRequests: arrayRemove(friendId),
      });

      await updateDoc(doc(db, 'users', friendId), {
        friends: arrayUnion(userId),
      });

      Alert.alert('Success', 'Friend request accepted!');
      loadFriends();
      loadFriendRequests();
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Error', 'Failed to accept friend request. Please try again.');
    }
  };

  const handleDeclineFriendRequest = async (friendId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        friendRequests: arrayRemove(friendId),
      });

      Alert.alert('Success', 'Friend request declined.');
      loadFriendRequests();
    } catch (error) {
      console.error('Error declining friend request:', error);
      Alert.alert('Error', 'Failed to decline friend request. Please try again.');
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    Alert.alert(
      'Remove Friend',
      'Are you sure you want to remove this friend?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'users', userId), {
                friends: arrayRemove(friendId),
              });

              await updateDoc(doc(db, 'users', friendId), {
                friends: arrayRemove(userId),
              });

              Alert.alert('Success', 'Friend removed.');
              loadFriends();
            } catch (error) {
              console.error('Error removing friend:', error);
              Alert.alert('Error', 'Failed to remove friend. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderFriendItem = (friend: FriendUser, showRemove: boolean = true) => (
    <View key={friend.id} style={styles.friendItem}>
      <View style={styles.friendAvatar}>
        {friend.photoURL ? (
          <Image source={{ uri: friend.photoURL }} style={styles.avatarImage} />
        ) : (
          <Ionicons name="person" size={32} color={Colors.gold} />
        )}
      </View>

      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{friend.displayName}</Text>
        <Text style={styles.friendEmail}>{friend.email}</Text>
      </View>

      {showRemove && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveFriend(friend.id)}
        >
          <Ionicons name="close-circle" size={24} color={Colors.error} />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderSearchResult = (user: FriendUser) => {
    const isFriend = friends.some((f) => f.id === user.id);
    const hasPendingRequest = friendRequests.some((r) => r.id === user.id);

    return (
      <View key={user.id} style={styles.searchResultItem}>
        <View style={styles.friendAvatar}>
          {user.photoURL ? (
            <Image source={{ uri: user.photoURL }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={32} color={Colors.gold} />
          )}
        </View>

        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{user.displayName}</Text>
          <Text style={styles.friendEmail}>{user.email}</Text>
        </View>

        {isFriend ? (
          <View style={styles.friendBadge}>
            <Text style={styles.friendBadgeText}>Friends</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleAddFriend(user.id)}
          >
            <Ionicons name="person-add" size={20} color={Colors.background} />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderFriendRequest = (request: FriendUser) => (
    <View key={request.id} style={styles.requestItem}>
      <View style={styles.friendAvatar}>
        {request.photoURL ? (
          <Image source={{ uri: request.photoURL }} style={styles.avatarImage} />
        ) : (
          <Ionicons name="person" size={32} color={Colors.gold} />
        )}
      </View>

      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>{request.displayName}</Text>
        <Text style={styles.friendEmail}>{request.email}</Text>
      </View>

      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.requestButton, styles.acceptButton]}
          onPress={() => handleAcceptFriendRequest(request.id)}
        >
          <Ionicons name="checkmark" size={20} color={Colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.requestButton, styles.declineButton]}
          onPress={() => handleDeclineFriendRequest(request.id)}
        >
          <Ionicons name="close" size={20} color={Colors.textLight} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSuggestion = (suggestion: FriendSuggestion) => {
    const isFriend = friends.some((f) => f.id === suggestion.userId);

    return (
      <View key={suggestion.userId} style={styles.suggestionItem}>
        <View style={styles.friendAvatar}>
          {suggestion.photoURL ? (
            <Image source={{ uri: suggestion.photoURL }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={32} color={Colors.gold} />
          )}
        </View>

        <View style={styles.suggestionInfo}>
          <Text style={styles.friendName}>{suggestion.displayName}</Text>
          <Text style={styles.friendEmail}>{suggestion.email}</Text>

          <View style={styles.suggestionMetrics}>
            <View style={styles.metricBadge}>
              <MaterialCommunityIcons name="silverware-fork-knife" size={14} color={Colors.gold} />
              <Text style={styles.metricText}>
                {suggestion.commonRestaurants.length} common
              </Text>
            </View>

            {suggestion.mutualFriends > 0 && (
              <View style={styles.metricBadge}>
                <Ionicons name="people" size={14} color={Colors.gold} />
                <Text style={styles.metricText}>
                  {suggestion.mutualFriends} mutual
                </Text>
              </View>
            )}
          </View>
        </View>

        {isFriend ? (
          <View style={styles.friendBadge}>
            <Text style={styles.friendBadgeText}>Friends</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => handleAddFriend(suggestion.userId)}
          >
            <Ionicons name="person-add" size={20} color={Colors.background} />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Friends</Text>
        {friendRequests.length > 0 && (
          <View style={styles.requestBadge}>
            <Text style={styles.requestBadgeText}>{friendRequests.length}</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'friends' && styles.activeTabText,
            ]}
          >
            Friends
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'suggestions' && styles.activeTab]}
          onPress={() => setActiveTab('suggestions')}
        >
          <Text
            style={[styles.tabText, activeTab === 'suggestions' && styles.activeTabText]}
          >
            Suggested
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'search' && styles.activeTab]}
          onPress={() => setActiveTab('search')}
        >
          <Text
            style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}
          >
            Search
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'friends' ? (
          <>
            {/* Friend Requests */}
            {friendRequests.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Friend Requests</Text>
                {friendRequests.map(renderFriendRequest)}
              </View>
            )}

            {/* Friends List */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Friends</Text>
              {loading ? (
                <ActivityIndicator size="large" color={Colors.gold} />
              ) : friends.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="people-outline"
                    size={64}
                    color={Colors.textMuted}
                  />
                  <Text style={styles.emptyText}>No friends yet</Text>
                  <Text style={styles.emptySubtext}>
                    Search for friends to get started!
                  </Text>
                </View>
              ) : (
                friends.map((friend) => renderFriendItem(friend))
              )}
            </View>
          </>
        ) : activeTab === 'suggestions' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Suggested Friends
            </Text>
            <Text style={styles.sectionDescription}>
              Based on your restaurant preferences and mutual friends
            </Text>

            {loadingSuggestions ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.gold} />
                <Text style={styles.loadingText}>Finding people with similar taste...</Text>
              </View>
            ) : suggestions.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="account-search"
                  size={64}
                  color={Colors.textMuted}
                />
                <Text style={styles.emptyText}>No suggestions yet</Text>
                <Text style={styles.emptySubtext}>
                  Start swiping on restaurants to find people with similar taste!
                </Text>
              </View>
            ) : (
              suggestions.map(renderSuggestion)
            )}
          </View>
        ) : (
          <View style={styles.section}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={20} color={Colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by email..."
                  placeholderTextColor={Colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="search"
                  onSubmitEditing={handleSearch}
                />
              </View>
              <TouchableOpacity
                style={styles.searchButton}
                onPress={handleSearch}
                disabled={searching}
              >
                {searching ? (
                  <ActivityIndicator size="small" color={Colors.background} />
                ) : (
                  <Ionicons name="arrow-forward" size={20} color={Colors.background} />
                )}
              </TouchableOpacity>
            </View>

            {/* Search Results */}
            {searchResults.length > 0 ? (
              <View style={styles.resultsContainer}>
                <Text style={styles.resultsTitle}>
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}{' '}
                  found
                </Text>
                {searchResults.map(renderSearchResult)}
              </View>
            ) : searchQuery && !searching ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="search-outline"
                  size={64}
                  color={Colors.textMuted}
                />
                <Text style={styles.emptyText}>No users found</Text>
                <Text style={styles.emptySubtext}>
                  Try searching with a different email
                </Text>
              </View>
            ) : null}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontFamily: 'PlayfairDisplay_900Black',
    fontSize: 36,
    color: Colors.textLight,
    letterSpacing: 0.5,
  },
  requestBadge: {
    position: 'absolute',
    right: 20,
    backgroundColor: Colors.error,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestBadgeText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: Colors.textLight,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Colors.gold,
  },
  tabText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    color: Colors.textSecondary,
  },
  activeTabText: {
    fontFamily: 'DMSans_700Bold',
    color: Colors.gold,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 22,
    color: Colors.gold,
    marginBottom: 16,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  friendAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: Colors.gold,
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 18,
    color: Colors.gold,
    marginBottom: 4,
  },
  friendEmail: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textMuted,
  },
  removeButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    color: Colors.textLight,
    paddingVertical: 14,
  },
  searchButton: {
    backgroundColor: Colors.gold,
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gold,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: Colors.background,
  },
  friendBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  friendBadgeText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 12,
    color: Colors.textLight,
  },
  resultsContainer: {
    marginTop: 8,
  },
  resultsTitle: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  requestButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: Colors.success,
  },
  declineButton: {
    backgroundColor: Colors.error,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 24,
    color: Colors.gold,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionMetrics: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  metricBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  metricText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  sectionDescription: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 20,
    marginTop: -8,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 16,
  },
  bottomSpacer: {
    height: 100,
  },
});
