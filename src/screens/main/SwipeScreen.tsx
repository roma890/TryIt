import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import Swiper from 'react-native-deck-swiper';
import { Ionicons } from '@expo/vector-icons';
import { Restaurant, FilterOptions } from '../../types';
import { RestaurantCard } from '../../components/swipe/RestaurantCard';
import { googlePlacesService } from '../../services/api/googlePlaces.service';
import { swipeService } from '../../services/firebase/swipe.service';
import { Colors } from '../../constants/colors';

interface SwipeScreenProps {
  userId: string;
  navigation: any;
  filters?: FilterOptions;
  onFiltersChange?: (filters: FilterOptions) => void;
}

export const SwipeScreen: React.FC<SwipeScreenProps> = ({
  userId,
  navigation,
  filters: externalFilters,
  onFiltersChange,
}) => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Use external filters if provided, otherwise use default
  const filters = externalFilters || {
    cuisines: [],
    priceRange: ['$', '$$', '$$$', '$$$$'],
    radius: 5000,
    dietaryRestrictions: [],
    allergies: [],
    openNow: false,
  };

  const swiperRef = useRef<any>(null);

  useEffect(() => {
    loadRestaurants();
  }, [filters, filters.location]);

  const getUserLocation = async (): Promise<{ latitude: number; longitude: number }> => {
    try {
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        console.warn('Location permission denied');
        // Fallback to default location (San Francisco)
        return {
          latitude: 37.7749,
          longitude: -122.4194,
        };
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.warn('Location error:', error);
      // Fallback to default location (San Francisco)
      return {
        latitude: 37.7749,
        longitude: -122.4194,
      };
    }
  };

  const loadRestaurants = async () => {
    try {
      setLoading(true);

      // Use location from filters if available, otherwise get user's current location
      let location;
      if (filters.location) {
        location = filters.location;
      } else {
        location = await getUserLocation();
      }

      const results = await googlePlacesService.searchNearbyRestaurants({
        latitude: location.latitude,
        longitude: location.longitude,
        radius: filters.radius,
        opennow: filters.openNow,
      });

      // Apply additional filters
      let filtered = results;

      if (filters.cuisines.length > 0) {
        filtered = filtered.filter((r) =>
          r.cuisine.some((c) => filters.cuisines.includes(c))
        );
      }

      if (filters.priceRange.length > 0) {
        filtered = filtered.filter((r) =>
          filters.priceRange.includes(r.priceLevel)
        );
      }

      if (filters.minRating) {
        filtered = filtered.filter((r) => r.rating >= filters.minRating!);
      }

      setRestaurants(filtered);
      setLoading(false);
    } catch (error) {
      console.error('Error loading restaurants:', error);
      setLoading(false);
      Alert.alert('Error', 'Failed to load restaurants');
    }
  };

  const handleSwipeLeft = async (index: number) => {
    const restaurant = restaurants[index];
    await swipeService.recordSwipe(userId, restaurant.id, 'left');
  };

  const handleSwipeRight = async (index: number) => {
    const restaurant = restaurants[index];
    await swipeService.recordSwipe(userId, restaurant.id, 'right');
    Alert.alert('Liked!', `You liked ${restaurant.name}`);
  };

  const handleCardPress = (index: number) => {
    const restaurant = restaurants[index];
    navigation.navigate('RestaurantDetails', { restaurant });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.gold} />
        <Text style={styles.loadingText}>Finding restaurants near you...</Text>
      </View>
    );
  }

  if (restaurants.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No restaurants found</Text>
        <Text style={styles.emptySubtext}>
          Try adjusting your filters or search radius
        </Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => navigation.navigate('Filters')}
        >
          <Text style={styles.filterButtonText}>Adjust Filters</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover Restaurants</Text>
        <TouchableOpacity
          style={styles.filterIcon}
          onPress={() => navigation.navigate('Filters')}
        >
          <Ionicons name="options-outline" size={24} color={Colors.gold} />
        </TouchableOpacity>
      </View>

      <View style={styles.swiperContainer}>
        <Swiper
          ref={swiperRef}
          cards={restaurants}
          renderCard={(restaurant) => (
            <RestaurantCard
              restaurant={restaurant}
              onPress={() => handleCardPress(restaurants.indexOf(restaurant))}
            />
          )}
          onSwipedLeft={handleSwipeLeft}
          onSwipedRight={handleSwipeRight}
          onSwipedAll={() => {
            Alert.alert(
              'No More Restaurants',
              'You have seen all restaurants. Load more?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Load More', onPress: loadRestaurants },
              ]
            );
          }}
          cardIndex={currentIndex}
          backgroundColor="transparent"
          stackSize={3}
          stackSeparation={15}
          stackScale={5}
          disableTopSwipe
          disableBottomSwipe
          animateCardOpacity
          verticalSwipe={false}
          overlayLabels={{
            left: {
              title: 'PASS',
              style: {
                label: {
                  backgroundColor: '#f44336',
                  borderColor: '#f44336',
                  color: '#fff',
                  borderWidth: 1,
                  fontSize: 24,
                  fontWeight: 'bold',
                  padding: 10,
                  borderRadius: 10,
                },
                wrapper: {
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  justifyContent: 'flex-start',
                  marginTop: 30,
                  marginLeft: -30,
                },
              },
            },
            right: {
              title: 'LIKE',
              style: {
                label: {
                  backgroundColor: '#4CAF50',
                  borderColor: '#4CAF50',
                  color: '#fff',
                  borderWidth: 1,
                  fontSize: 24,
                  fontWeight: 'bold',
                  padding: 10,
                  borderRadius: 10,
                },
                wrapper: {
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-start',
                  marginTop: 30,
                  marginLeft: 30,
                },
              },
            },
          }}
        />
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.passButton]}
          onPress={() => swiperRef.current?.swipeLeft()}
        >
          <Ionicons name="close" size={32} color={Colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.infoButton]}
          onPress={() => handleCardPress(currentIndex)}
        >
          <Ionicons name="information" size={28} color={Colors.background} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.likeButton]}
          onPress={() => swiperRef.current?.swipeRight()}
        >
          <Ionicons name="heart" size={32} color={Colors.textLight} />
        </TouchableOpacity>
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 28,
    color: Colors.textLight,
    letterSpacing: 0.5,
  },
  filterIcon: {
    padding: 10,
    backgroundColor: Colors.card,
    borderRadius: 12,
  },
  filterIconText: {
    fontSize: 24,
  },
  swiperContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingBottom: 95,
    paddingTop: 20,
    backgroundColor: 'transparent',
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  passButton: {
    backgroundColor: Colors.error,
  },
  infoButton: {
    backgroundColor: Colors.gold,
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  likeButton: {
    backgroundColor: Colors.success,
  },
  buttonIcon: {
    fontSize: 28,
    color: Colors.textLight,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    fontFamily: 'DMSans_500Medium',
    marginTop: 16,
    fontSize: 17,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 20,
  },
  emptyText: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 24,
    color: Colors.textLight,
    marginBottom: 8,
  },
  emptySubtext: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  filterButton: {
    marginTop: 24,
    backgroundColor: Colors.gold,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  filterButtonText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 17,
    color: Colors.background,
    letterSpacing: 0.5,
  },
});
