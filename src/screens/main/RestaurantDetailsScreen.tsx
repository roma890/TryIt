import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Restaurant } from '../../types';
import { googlePlacesService } from '../../services/api/googlePlaces.service';
import { Colors } from '../../constants/colors';

const { width } = Dimensions.get('window');

interface RestaurantDetailsScreenProps {
  route: any;
  navigation: any;
}

export const RestaurantDetailsScreen: React.FC<RestaurantDetailsScreenProps> = ({
  route,
  navigation,
}) => {
  const { restaurant: initialRestaurant } = route.params || {};
  const [restaurant, setRestaurant] = useState<Restaurant | null>(initialRestaurant);
  const [loading, setLoading] = useState(true);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  useEffect(() => {
    loadRestaurantDetails();
  }, []);

  const loadRestaurantDetails = async () => {
    try {
      setLoading(true);
      if (initialRestaurant?.placeId) {
        const details = await googlePlacesService.getRestaurantDetails(
          initialRestaurant.placeId
        );
        if (details) {
          setRestaurant(details);
          // Reviews will be part of the details response
          // Note: Google Places API returns reviews in the details endpoint
        }
      }
    } catch (error) {
      console.error('Error loading restaurant details:', error);
    } finally {
      setLoading(false);
    }
  };

  const openWebsite = () => {
    if (restaurant?.website) {
      Linking.openURL(restaurant.website);
    }
  };

  const openMaps = () => {
    if (restaurant?.location) {
      const url = `https://www.google.com/maps/search/?api=1&query=${restaurant.location.latitude},${restaurant.location.longitude}&query_place_id=${restaurant.placeId}`;
      Linking.openURL(url);
    }
  };

  const callRestaurant = () => {
    if (restaurant?.phoneNumber) {
      Linking.openURL(`tel:${restaurant.phoneNumber}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.gold} />
        <Text style={styles.loadingText}>Loading details...</Text>
      </View>
    );
  }

  if (!restaurant) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Restaurant not found</Text>
      </View>
    );
  }

  const mainPhotos = restaurant.photos || [];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Photo Gallery */}
      {mainPhotos.length > 0 && (
        <View style={styles.photoGallery}>
          <Image
            source={{ uri: mainPhotos[selectedPhotoIndex] }}
            style={styles.mainPhoto}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(15, 23, 42, 0.7)']}
            style={styles.photoOverlay}
          />
          {mainPhotos.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.photoThumbnails}
              contentContainerStyle={styles.photoThumbnailsContent}
            >
              {mainPhotos.map((photo, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setSelectedPhotoIndex(index)}
                  style={[
                    styles.thumbnail,
                    selectedPhotoIndex === index && styles.thumbnailSelected,
                  ]}
                >
                  <Image
                    source={{ uri: photo }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* Restaurant Info */}
      <View style={styles.infoSection}>
        <Text style={styles.restaurantName}>{restaurant.name}</Text>

        <View style={styles.ratingRow}>
          <View style={styles.ratingContainer}>
            <Text style={styles.rating}>⭐ {restaurant.rating.toFixed(1)}</Text>
            <Text style={styles.reviewCount}>
              ({restaurant.reviewCount} reviews)
            </Text>
          </View>
          <Text style={styles.priceLevel}>{restaurant.priceLevel}</Text>
        </View>

        {restaurant.cuisine && restaurant.cuisine.length > 0 && (
          <View style={styles.cuisineContainer}>
            {restaurant.cuisine.map((cuisine, index) => (
              <View key={index} style={styles.cuisineTag}>
                <Text style={styles.cuisineText}>
                  {cuisine.replace(/_/g, ' ')}
                </Text>
              </View>
            ))}
          </View>
        )}

        {restaurant.openingHours?.open_now !== undefined && (
          <View
            style={[
              styles.openStatus,
              restaurant.openingHours.open_now
                ? styles.openNow
                : styles.closed,
            ]}
          >
            <Text style={styles.openStatusText}>
              {restaurant.openingHours.open_now ? '🟢 Open Now' : '🔴 Closed'}
            </Text>
          </View>
        )}

        <View style={styles.addressContainer}>
          <Text style={styles.addressLabel}>📍 Address</Text>
          <Text style={styles.addressText}>{restaurant.address}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {restaurant.phoneNumber && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={callRestaurant}
            >
              <Text style={styles.actionButtonIcon}>📞</Text>
              <Text style={styles.actionButtonText}>Call</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.actionButton} onPress={openMaps}>
            <Text style={styles.actionButtonIcon}>🗺️</Text>
            <Text style={styles.actionButtonText}>Directions</Text>
          </TouchableOpacity>

          {restaurant.website && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={openWebsite}
            >
              <Text style={styles.actionButtonIcon}>🌐</Text>
              <Text style={styles.actionButtonText}>Website</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Menu Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🍽️ Menu</Text>
        <View style={styles.menuPlaceholder}>
          <Text style={styles.menuPlaceholderText}>
            Menu information coming soon!
          </Text>
          <Text style={styles.menuPlaceholderSubtext}>
            Visit the website or call to view the full menu
          </Text>
          {restaurant.website && (
            <TouchableOpacity
              style={styles.viewMenuButton}
              onPress={openWebsite}
            >
              <Text style={styles.viewMenuButtonText}>View on Website</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Reviews Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⭐ Reviews</Text>
        {restaurant.reviews && restaurant.reviews.length > 0 ? (
          <View style={styles.reviewsContainer}>
            {restaurant.reviews.slice(0, 5).map((review, index) => (
              <View key={index} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  {review.profile_photo_url && (
                    <Image
                      source={{ uri: review.profile_photo_url }}
                      style={styles.reviewAvatar}
                    />
                  )}
                  <View style={styles.reviewHeaderInfo}>
                    <Text style={styles.reviewAuthor}>{review.author_name}</Text>
                    <View style={styles.reviewRatingRow}>
                      <Text style={styles.reviewRating}>
                        {'⭐'.repeat(review.rating)}
                      </Text>
                      <Text style={styles.reviewTime}>
                        {review.relative_time_description || 'Recently'}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text style={styles.reviewText} numberOfLines={4}>
                  {review.text}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.reviewsPlaceholder}>
            <Text style={styles.reviewsPlaceholderText}>
              No reviews available
            </Text>
            <Text style={styles.reviewsPlaceholderSubtext}>
              Be the first to review this restaurant!
            </Text>
          </View>
        )}
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 18,
    color: Colors.error,
  },
  photoGallery: {
    height: 300,
    backgroundColor: Colors.card,
  },
  mainPhoto: {
    width: '100%',
    height: 300,
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  photoThumbnails: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
  },
  photoThumbnailsContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  thumbnail: {
    width: 70,
    height: 70,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  thumbnailSelected: {
    borderColor: Colors.primary,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  infoSection: {
    padding: 20,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  restaurantName: {
    fontFamily: 'PlayfairDisplay_900Black',
    fontSize: 32,
    color: Colors.textLight,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rating: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 18,
    color: Colors.textLight,
  },
  reviewCount: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: Colors.textSecondary,
  },
  priceLevel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 22,
    color: Colors.gold,
  },
  cuisineContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  cuisineTag: {
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cuisineText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: Colors.background,
    textTransform: 'capitalize',
  },
  openStatus: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
  },
  openNow: {
    backgroundColor: Colors.success,
  },
  closed: {
    backgroundColor: Colors.error,
  },
  openStatusText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: Colors.textLight,
  },
  addressContainer: {
    marginBottom: 20,
  },
  addressLabel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: Colors.textLight,
    marginBottom: 6,
  },
  addressText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  actionButtonText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
    color: Colors.background,
    letterSpacing: 0.5,
  },
  section: {
    padding: 20,
    backgroundColor: Colors.surface,
    marginTop: 12,
  },
  sectionTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 24,
    color: Colors.textLight,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  menuPlaceholder: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  menuPlaceholderText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 18,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  menuPlaceholderSubtext: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 16,
  },
  viewMenuButton: {
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  viewMenuButtonText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: Colors.background,
    letterSpacing: 0.5,
  },
  reviewsContainer: {
    gap: 16,
  },
  reviewCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  reviewAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.border,
  },
  reviewHeaderInfo: {
    flex: 1,
  },
  reviewAuthor: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: Colors.textLight,
    marginBottom: 4,
  },
  reviewRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewRating: {
    fontSize: 14,
  },
  reviewTime: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
  },
  reviewText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  reviewsPlaceholder: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  reviewsPlaceholderText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 18,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  reviewsPlaceholderSubtext: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
});
