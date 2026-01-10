import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  deleteDoc,
} from 'firebase/firestore';
import { db } from './config';
import { swipeService } from './swipe.service';
import { googlePlacesService } from '../api/googlePlaces.service';
import { Restaurant, Swipe } from '../../types';

export const firestoreService = {
  // Get user's swipes
  getUserSwipes: async (userId: string): Promise<Swipe[]> => {
    try {
      return await swipeService.getUserSwipes(userId);
    } catch (error) {
      console.error('Error getting user swipes:', error);
      return [];
    }
  },

  // Get liked restaurants with full data
  getLikedRestaurants: async (userId: string): Promise<Restaurant[]> => {
    try {
      const restaurantIds = await swipeService.getLikedRestaurants(userId);

      if (restaurantIds.length === 0) {
        return [];
      }

      // Fetch restaurant data from Google Places API
      const restaurants: Restaurant[] = [];

      for (const placeId of restaurantIds) {
        try {
          const restaurant = await googlePlacesService.getRestaurantDetails(placeId);
          if (restaurant) {
            restaurants.push(restaurant);
          }
        } catch (error) {
          console.error(`Error fetching restaurant ${placeId}:`, error);
        }
      }

      return restaurants;
    } catch (error) {
      console.error('Error getting liked restaurants:', error);
      return [];
    }
  },

  // Remove a swipe (unlike a restaurant)
  removeSwipe: async (userId: string, restaurantId: string): Promise<void> => {
    try {
      const q = query(
        collection(db, 'swipes'),
        where('userId', '==', userId),
        where('restaurantId', '==', restaurantId)
      );

      const querySnapshot = await getDocs(q);

      for (const docSnapshot of querySnapshot.docs) {
        await deleteDoc(doc(db, 'swipes', docSnapshot.id));
      }
    } catch (error) {
      console.error('Error removing swipe:', error);
      throw error;
    }
  },

  // Get restaurant by ID (Google Place ID)
  getRestaurant: async (placeId: string): Promise<Restaurant | null> => {
    try {
      return await googlePlacesService.getRestaurantDetails(placeId);
    } catch (error) {
      console.error('Error getting restaurant:', error);
      return null;
    }
  },

  // Get user matches
  getUserMatches: async (userId: string) => {
    return swipeService.getUserMatches(userId);
  },

  // Record a swipe
  recordSwipe: async (
    userId: string,
    restaurantId: string,
    direction: 'left' | 'right'
  ) => {
    return swipeService.recordSwipe(userId, restaurantId, direction);
  },
};
