import axios from 'axios';
import { Restaurant, OpeningHours } from '../../types';

const GOOGLE_PLACES_API_KEY = 'AIzaSyCKkVekEKBjnbf69WfkMi3q2DG3AiJOJuc';
const GOOGLE_PLACES_BASE_URL = 'https://maps.googleapis.com/maps/api/place';

export interface NearbySearchParams {
  latitude: number;
  longitude: number;
  radius: number; // in meters
  type?: string;
  keyword?: string;
  minprice?: number; // 0-4
  maxprice?: number; // 0-4
  opennow?: boolean;
}

export const googlePlacesService = {
  // Search for nearby restaurants
  searchNearbyRestaurants: async (
    params: NearbySearchParams
  ): Promise<Restaurant[]> => {
    try {
      const { latitude, longitude, radius, type = 'restaurant', ...otherParams } = params;

      const response = await axios.get(
        `${GOOGLE_PLACES_BASE_URL}/nearbysearch/json`,
        {
          params: {
            location: `${latitude},${longitude}`,
            radius,
            type,
            key: GOOGLE_PLACES_API_KEY,
            ...otherParams,
          },
        }
      );

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Places API error: ${response.data.status}`);
      }

      const restaurants: Restaurant[] = response.data.results.map((place: any) => ({
        id: place.place_id,
        placeId: place.place_id,
        name: place.name,
        address: place.vicinity,
        location: {
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
        },
        cuisine: place.types?.filter((t: string) =>
          !['restaurant', 'food', 'point_of_interest', 'establishment'].includes(t)
        ) || [],
        priceLevel: convertPriceLevel(place.price_level),
        rating: place.rating || 0,
        reviewCount: place.user_ratings_total || 0,
        photos: place.photos?.map((photo: any) =>
          getPhotoUrl(photo.photo_reference)
        ) || [],
        openingHours: place.opening_hours,
      }));

      return restaurants;
    } catch (error: any) {
      console.error('Error searching nearby restaurants:', error);
      throw error;
    }
  },

  // Get restaurant details
  getRestaurantDetails: async (placeId: string): Promise<Restaurant | null> => {
    try {
      const response = await axios.get(
        `${GOOGLE_PLACES_BASE_URL}/details/json`,
        {
          params: {
            place_id: placeId,
            fields: 'name,rating,formatted_phone_number,opening_hours,price_level,photos,reviews,website,geometry,vicinity,types,user_ratings_total,formatted_address',
            key: GOOGLE_PLACES_API_KEY,
          },
        }
      );

      if (response.data.status !== 'OK') {
        throw new Error(`Google Places API error: ${response.data.status}`);
      }

      const place = response.data.result;

      const restaurant: Restaurant = {
        id: placeId,
        placeId,
        name: place.name,
        address: place.vicinity || place.formatted_address,
        location: {
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
        },
        cuisine: place.types?.filter((t: string) =>
          !['restaurant', 'food', 'point_of_interest', 'establishment'].includes(t)
        ) || [],
        priceLevel: convertPriceLevel(place.price_level),
        rating: place.rating || 0,
        reviewCount: place.user_ratings_total || 0,
        photos: place.photos?.map((photo: any) =>
          getPhotoUrl(photo.photo_reference, 800)
        ) || [],
        openingHours: place.opening_hours,
        phoneNumber: place.formatted_phone_number,
        website: place.website,
        reviews: place.reviews || [],
      };

      return restaurant;
    } catch (error: any) {
      console.error('Error getting restaurant details:', error);
      return null;
    }
  },

  // Get photo URL
  getPhotoUrl: (photoReference: string, maxWidth: number = 400): string => {
    return getPhotoUrl(photoReference, maxWidth);
  },

  // Autocomplete restaurant search
  autocomplete: async (input: string, latitude?: number, longitude?: number): Promise<any[]> => {
    try {
      const params: any = {
        input,
        types: 'establishment',
        key: GOOGLE_PLACES_API_KEY,
      };

      if (latitude && longitude) {
        params.location = `${latitude},${longitude}`;
        params.radius = 50000; // 50km
      }

      const response = await axios.get(
        `${GOOGLE_PLACES_BASE_URL}/autocomplete/json`,
        { params }
      );

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        throw new Error(`Google Places API error: ${response.data.status}`);
      }

      return response.data.predictions || [];
    } catch (error: any) {
      console.error('Error in autocomplete:', error);
      return [];
    }
  },
};

// Helper functions
const convertPriceLevel = (priceLevel?: number): '$' | '$$' | '$$$' | '$$$$' => {
  switch (priceLevel) {
    case 0:
    case 1:
      return '$';
    case 2:
      return '$$';
    case 3:
      return '$$$';
    case 4:
      return '$$$$';
    default:
      return '$$';
  }
};

const getPhotoUrl = (photoReference: string, maxWidth: number = 400): string => {
  return `${GOOGLE_PLACES_BASE_URL}/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${GOOGLE_PLACES_API_KEY}`;
};
