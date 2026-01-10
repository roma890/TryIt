import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import { Swipe, SwipeMatch } from '../../types';

export const swipeService = {
  // Record a swipe
  recordSwipe: async (
    userId: string,
    restaurantId: string,
    direction: 'left' | 'right'
  ): Promise<void> => {
    try {
      const swipeData: Omit<Swipe, 'id'> = {
        userId,
        restaurantId,
        direction,
        timestamp: new Date(),
      };

      const swipeRef = doc(collection(db, 'swipes'));
      await setDoc(swipeRef, {
        ...swipeData,
        timestamp: Timestamp.fromDate(swipeData.timestamp),
      });

      // If right swipe, check for matches with friends
      if (direction === 'right') {
        await checkForMatches(userId, restaurantId);
      }
    } catch (error: any) {
      console.error('Error recording swipe:', error);
      throw error;
    }
  },

  // Get user's swipes
  getUserSwipes: async (userId: string): Promise<Swipe[]> => {
    try {
      const q = query(
        collection(db, 'swipes'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(100)
      );

      const querySnapshot = await getDocs(q);
      const swipes: Swipe[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate(),
      })) as Swipe[];

      return swipes;
    } catch (error: any) {
      console.error('Error getting user swipes:', error);
      return [];
    }
  },

  // Get liked restaurants
  getLikedRestaurants: async (userId: string): Promise<string[]> => {
    try {
      const q = query(
        collection(db, 'swipes'),
        where('userId', '==', userId),
        where('direction', '==', 'right')
      );

      const querySnapshot = await getDocs(q);
      const restaurantIds = querySnapshot.docs.map(
        (doc) => doc.data().restaurantId
      );

      return restaurantIds;
    } catch (error: any) {
      console.error('Error getting liked restaurants:', error);
      return [];
    }
  },

  // Get matches for a user
  getUserMatches: async (userId: string): Promise<SwipeMatch[]> => {
    try {
      const q = query(
        collection(db, 'matches'),
        where('userIds', 'array-contains', userId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const matches: SwipeMatch[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      })) as SwipeMatch[];

      return matches;
    } catch (error: any) {
      console.error('Error getting user matches:', error);
      return [];
    }
  },
};

// Helper function to check for matches
const checkForMatches = async (
  userId: string,
  restaurantId: string
): Promise<void> => {
  try {
    // Get user's friends
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return;

    const friends = userDoc.data().friends || [];

    if (friends.length === 0) return;

    // Check if any friends also swiped right on this restaurant
    const q = query(
      collection(db, 'swipes'),
      where('restaurantId', '==', restaurantId),
      where('direction', '==', 'right'),
      where('userId', 'in', friends.slice(0, 10)) // Firestore 'in' limit is 10
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) return;

    // Create matches for each friend who swiped right
    for (const friendSwipeDoc of querySnapshot.docs) {
      const friendId = friendSwipeDoc.data().userId;

      // Check if match already exists
      const existingMatchQuery = query(
        collection(db, 'matches'),
        where('restaurantId', '==', restaurantId),
        where('userIds', 'array-contains', userId)
      );

      const existingMatches = await getDocs(existingMatchQuery);
      const matchExists = existingMatches.docs.some((doc) => {
        const userIds = doc.data().userIds;
        return userIds.includes(friendId);
      });

      if (!matchExists) {
        // Create new match
        const matchData: Omit<SwipeMatch, 'id'> = {
          userIds: [userId, friendId],
          restaurantId,
          createdAt: new Date(),
        };

        const matchRef = doc(collection(db, 'matches'));
        await setDoc(matchRef, {
          ...matchData,
          createdAt: Timestamp.fromDate(matchData.createdAt),
        });

        console.log(`Match created between ${userId} and ${friendId} for restaurant ${restaurantId}`);
      }
    }
  } catch (error: any) {
    console.error('Error checking for matches:', error);
  }
};
