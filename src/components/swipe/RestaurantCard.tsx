import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Restaurant } from '../../types';
import { Colors } from '../../constants/colors';

const { width, height } = Dimensions.get('window');

interface RestaurantCardProps {
  restaurant: Restaurant;
  onPress?: () => void;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  onPress,
}) => {
  const mainPhoto = restaurant.photos?.[0] || 'https://via.placeholder.com/400';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.95}
    >
      <Image source={{ uri: mainPhoto }} style={styles.image} />

      <LinearGradient
        colors={['transparent', 'rgba(15, 23, 42, 0.75)', 'rgba(15, 23, 42, 0.98)']}
        style={styles.overlay}
      >
        <View style={styles.infoContainer}>
          <Text style={styles.name} numberOfLines={2}>
            {restaurant.name}
          </Text>

          <View style={styles.detailsRow}>
            <View style={styles.ratingContainer}>
              <Text style={styles.rating}>⭐ {restaurant.rating.toFixed(1)}</Text>
              <Text style={styles.reviewCount}>
                ({restaurant.reviewCount} reviews)
              </Text>
            </View>
            <Text style={styles.priceLevel}>{restaurant.priceLevel}</Text>
          </View>

          <Text style={styles.address} numberOfLines={1}>
            📍 {restaurant.address}
          </Text>

          {restaurant.distanceFromUser && (
            <Text style={styles.distance}>
              {(restaurant.distanceFromUser / 1000).toFixed(1)} km away
            </Text>
          )}

          {restaurant.cuisine && restaurant.cuisine.length > 0 && (
            <View style={styles.cuisineContainer}>
              {restaurant.cuisine.slice(0, 3).map((cuisine, index) => (
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
                styles.openStatusContainer,
                restaurant.openingHours.open_now
                  ? styles.openNow
                  : styles.closed,
              ]}
            >
              <Text style={styles.openStatusText}>
                {restaurant.openingHours.open_now ? 'Open Now' : 'Closed'}
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: width - 40,
    height: height * 0.7,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 120,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  infoContainer: {
    gap: 10,
  },
  name: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 24,
    color: Colors.textLight,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 15,
    letterSpacing: 0.3,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rating: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.textLight,
  },
  reviewCount: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
  priceLevel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    color: Colors.gold,
  },
  address: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
  },
  distance: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 12,
    color: Colors.gold,
  },
  cuisineContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  cuisineTag: {
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  cuisineText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: Colors.background,
    textTransform: 'capitalize',
    letterSpacing: 0.3,
  },
  openStatusContainer: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 6,
  },
  openNow: {
    backgroundColor: Colors.success,
  },
  closed: {
    backgroundColor: Colors.error,
  },
  openStatusText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
    color: Colors.textLight,
    letterSpacing: 0.3,
  },
});
