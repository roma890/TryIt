import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from './config';
import { swipeService } from './swipe.service';

export interface FriendSuggestion {
  userId: string;
  displayName: string;
  email: string;
  photoURL?: string;
  matchScore: number;
  commonRestaurants: string[];
  mutualFriends: number;
}

export const friendsService = {
  /**
   * Get friend suggestions based on restaurant preferences
   * Algorithm considers:
   * 1. Users who liked the same restaurants
   * 2. Mutual friends
   * 3. Users not already friends with
   */
  getFriendSuggestions: async (
    userId: string,
    limit: number = 10
  ): Promise<FriendSuggestion[]> => {
    try {
      // Get current user's data
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        return [];
      }

      const currentUserFriends = userDoc.data().friends || [];

      // Get user's liked restaurants
      const likedRestaurants = await swipeService.getLikedRestaurants(userId);

      if (likedRestaurants.length === 0) {
        return [];
      }

      // Find all users who liked the same restaurants
      const swipesQuery = query(
        collection(db, 'swipes'),
        where('direction', '==', 'right'),
        where('restaurantId', 'in', likedRestaurants.slice(0, 10)) // Firestore 'in' limit is 10
      );

      const swipesSnapshot = await getDocs(swipesQuery);

      // Calculate match scores for each user
      const userScores = new Map<string, {
        commonRestaurants: Set<string>;
        user: any;
      }>();

      for (const swipeDoc of swipesSnapshot.docs) {
        const swipeData = swipeDoc.data();
        const otherUserId = swipeData.userId;

        // Skip if it's the current user or already a friend
        if (
          otherUserId === userId ||
          currentUserFriends.includes(otherUserId)
        ) {
          continue;
        }

        // Get or create entry for this user
        if (!userScores.has(otherUserId)) {
          const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));
          if (!otherUserDoc.exists()) continue;

          userScores.set(otherUserId, {
            commonRestaurants: new Set(),
            user: {
              id: otherUserDoc.id,
              ...otherUserDoc.data(),
            },
          });
        }

        // Add this restaurant to common restaurants
        userScores.get(otherUserId)!.commonRestaurants.add(
          swipeData.restaurantId
        );
      }

      // Calculate mutual friends and create suggestions
      const suggestions: FriendSuggestion[] = [];

      for (const [otherUserId, data] of userScores.entries()) {
        const otherUserFriends = data.user.friends || [];

        // Calculate mutual friends
        const mutualFriends = currentUserFriends.filter((friendId: string) =>
          otherUserFriends.includes(friendId)
        ).length;

        // Calculate match score
        // Formula: (common restaurants * 10) + (mutual friends * 5)
        const matchScore =
          data.commonRestaurants.size * 10 + mutualFriends * 5;

        suggestions.push({
          userId: otherUserId,
          displayName: data.user.displayName || 'Unknown',
          email: data.user.email || '',
          photoURL: data.user.photoURL,
          matchScore,
          commonRestaurants: Array.from(data.commonRestaurants),
          mutualFriends,
        });
      }

      // Sort by match score (highest first) and limit results
      suggestions.sort((a, b) => b.matchScore - a.matchScore);

      return suggestions.slice(0, limit);
    } catch (error) {
      console.error('Error getting friend suggestions:', error);
      return [];
    }
  },

  /**
   * Get friend suggestions in batches to handle Firestore 'in' query limitation
   */
  getFriendSuggestionsOptimized: async (
    userId: string,
    limit: number = 10
  ): Promise<FriendSuggestion[]> => {
    try {
      // Get current user's data
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        return [];
      }

      const currentUserFriends = userDoc.data().friends || [];

      // Get user's liked restaurants
      const likedRestaurants = await swipeService.getLikedRestaurants(userId);

      if (likedRestaurants.length === 0) {
        return [];
      }

      // Process in batches of 10 (Firestore 'in' limit)
      const userScores = new Map<string, {
        commonRestaurants: Set<string>;
        user: any;
      }>();

      const batchSize = 10;
      for (let i = 0; i < likedRestaurants.length; i += batchSize) {
        const batch = likedRestaurants.slice(i, i + batchSize);

        const swipesQuery = query(
          collection(db, 'swipes'),
          where('direction', '==', 'right'),
          where('restaurantId', 'in', batch)
        );

        const swipesSnapshot = await getDocs(swipesQuery);

        for (const swipeDoc of swipesSnapshot.docs) {
          const swipeData = swipeDoc.data();
          const otherUserId = swipeData.userId;

          // Skip if it's the current user or already a friend
          if (
            otherUserId === userId ||
            currentUserFriends.includes(otherUserId)
          ) {
            continue;
          }

          // Get or create entry for this user
          if (!userScores.has(otherUserId)) {
            const otherUserDoc = await getDoc(doc(db, 'users', otherUserId));
            if (!otherUserDoc.exists()) continue;

            userScores.set(otherUserId, {
              commonRestaurants: new Set(),
              user: {
                id: otherUserDoc.id,
                ...otherUserDoc.data(),
              },
            });
          }

          // Add this restaurant to common restaurants
          userScores.get(otherUserId)!.commonRestaurants.add(
            swipeData.restaurantId
          );
        }
      }

      // Calculate mutual friends and create suggestions
      const suggestions: FriendSuggestion[] = [];

      for (const [otherUserId, data] of userScores.entries()) {
        const otherUserFriends = data.user.friends || [];

        // Calculate mutual friends
        const mutualFriends = currentUserFriends.filter((friendId: string) =>
          otherUserFriends.includes(friendId)
        ).length;

        // Calculate match score
        // Formula: (common restaurants * 10) + (mutual friends * 5)
        const matchScore =
          data.commonRestaurants.size * 10 + mutualFriends * 5;

        suggestions.push({
          userId: otherUserId,
          displayName: data.user.displayName || 'Unknown',
          email: data.user.email || '',
          photoURL: data.user.photoURL,
          matchScore,
          commonRestaurants: Array.from(data.commonRestaurants),
          mutualFriends,
        });
      }

      // Sort by match score (highest first) and limit results
      suggestions.sort((a, b) => b.matchScore - a.matchScore);

      return suggestions.slice(0, limit);
    } catch (error) {
      console.error('Error getting friend suggestions:', error);
      return [];
    }
  },
};
