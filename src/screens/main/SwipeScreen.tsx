import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Image,
} from 'react-native';
import * as Location from 'expo-location';
import Swiper from 'react-native-deck-swiper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [likedRestaurant, setLikedRestaurant] = useState<Restaurant | null>(null);
  const likeAnimationScale = useRef(new Animated.Value(0)).current;
  const likeAnimationOpacity = useRef(new Animated.Value(0)).current;

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

      // Get liked restaurants to exclude from discover feed
      const likedRestaurantIds = await swipeService.getLikedRestaurants(userId);

      // Apply additional filters
      let filtered = results;

      // Exclude restaurants that user has already liked
      filtered = filtered.filter((r) => !likedRestaurantIds.includes(r.id));

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

      // Remove duplicates based on restaurant ID
      const uniqueRestaurants = filtered.filter(
        (restaurant, index, self) =>
          index === self.findIndex((r) => r.id === restaurant.id)
      );

      setRestaurants(uniqueRestaurants);
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

  const showLikePopup = (restaurant: Restaurant) => {
    setLikedRestaurant(restaurant);
    setShowLikeAnimation(true);

    // Reset animation values
    likeAnimationScale.setValue(0);
    likeAnimationOpacity.setValue(0);

    // Start animation
    Animated.parallel([
      Animated.spring(likeAnimationScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(likeAnimationOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Hide after 2 seconds
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(likeAnimationScale, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(likeAnimationOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowLikeAnimation(false);
        setLikedRestaurant(null);
      });
    }, 2000);
  };

  const handleSwipeRight = async (index: number) => {
    const restaurant = restaurants[index];
    await swipeService.recordSwipe(userId, restaurant.id, 'right');
    showLikePopup(restaurant);
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
          <LinearGradient
            colors={[Colors.accent, Colors.accentLight]}
            style={styles.filterButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.filterButtonText}>Adjust Filters</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.primaryDark, Colors.background, Colors.surface]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <Text style={styles.headerTitle}>Discover Restaurants</Text>
        <TouchableOpacity
          style={styles.filterIcon}
          onPress={() => navigation.navigate('Filters')}
        >
          <LinearGradient
            colors={[Colors.accent, Colors.accentLight]}
            style={styles.filterIconGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="options-outline" size={22} color={Colors.textLight} />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

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
                  backgroundColor: '#EF4444',
                  borderColor: '#EF4444',
                  color: '#fff',
                  borderWidth: 2,
                  fontSize: 26,
                  fontWeight: 'bold',
                  padding: 12,
                  borderRadius: 16,
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
                  backgroundColor: '#10B981',
                  borderColor: '#10B981',
                  color: '#fff',
                  borderWidth: 2,
                  fontSize: 26,
                  fontWeight: 'bold',
                  padding: 12,
                  borderRadius: 16,
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
          style={styles.modernActionButton}
          onPress={() => swiperRef.current?.swipeLeft()}
        >
          <LinearGradient
            colors={['#EF4444', '#DC2626']}
            style={styles.passButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="close" size={32} color={Colors.textLight} />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.modernInfoButton}
          onPress={() => handleCardPress(currentIndex)}
        >
          <LinearGradient
            colors={[Colors.accent, Colors.accentLight]}
            style={styles.infoButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="information" size={28} color={Colors.textLight} />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.modernActionButton}
          onPress={() => swiperRef.current?.swipeRight()}
        >
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.likeButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="heart" size={32} color={Colors.textLight} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Like Animation Popup */}
      {showLikeAnimation && likedRestaurant && (
        <Animated.View
          style={[
            styles.likeAnimationContainer,
            {
              opacity: likeAnimationOpacity,
              transform: [{ scale: likeAnimationScale }],
            },
          ]}
        >
          <View style={styles.likeAnimationCard}>
            {likedRestaurant.photos && likedRestaurant.photos[0] && (
              <Image
                source={{ uri: likedRestaurant.photos[0] }}
                style={styles.likeAnimationImage}
              />
            )}
            <LinearGradient
              colors={['rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.8)']}
              style={styles.likeAnimationOverlay}
            >
              <View style={styles.likeAnimationIconContainer}>
                <LinearGradient
                  colors={[Colors.accent, Colors.accentLight]}
                  style={styles.likeIconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="heart" size={60} color={Colors.textLight} />
                </LinearGradient>
              </View>
              <Text style={styles.likeAnimationText}>Liked!</Text>
              <Text style={styles.likeAnimationRestaurantName} numberOfLines={1}>
                {likedRestaurant.name}
              </Text>
            </LinearGradient>
          </View>
        </Animated.View>
      )}
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
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
  },
  headerTitle: {
    fontFamily: 'PlayfairDisplay_900Black',
    fontSize: 32,
    color: Colors.textLight,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  filterIcon: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  filterIconGradient: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
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
    gap: 24,
    paddingBottom: 95,
    paddingTop: 20,
    backgroundColor: 'transparent',
  },
  modernActionButton: {
    borderRadius: 36,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  passButtonGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernInfoButton: {
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  infoButtonGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeButtonGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: 40,
  },
  emptyText: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 28,
    color: Colors.gold,
    marginBottom: 12,
  },
  emptySubtext: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 24,
  },
  filterButton: {
    marginTop: 32,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  filterButtonGradient: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  filterButtonText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 17,
    color: Colors.primaryDark,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  likeAnimationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  likeAnimationCard: {
    width: 300,
    height: 400,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  likeAnimationImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  likeAnimationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeAnimationIconContainer: {
    borderRadius: 80,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  likeIconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeAnimationText: {
    fontFamily: 'PlayfairDisplay_900Black',
    fontSize: 56,
    color: Colors.textLight,
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 12,
  },
  likeAnimationRestaurantName: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 24,
    color: Colors.gold,
    textAlign: 'center',
    paddingHorizontal: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
});
