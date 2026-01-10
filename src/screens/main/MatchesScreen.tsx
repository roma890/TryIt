import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Restaurant } from '../../types';
import { firestoreService } from '../../services/firebase/firestore.service';
import { Colors } from '../../constants/colors';

interface MatchesScreenProps {
  navigation: any;
  userId: string;
}

export const MatchesScreen: React.FC<MatchesScreenProps> = ({
  navigation,
  userId,
}) => {
  const [matches, setMatches] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      setLoading(true);
      const likedRestaurants = await firestoreService.getLikedRestaurants(userId);
      setMatches(likedRestaurants);
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMatches();
    setRefreshing(false);
  };

  const handleRestaurantPress = (restaurant: Restaurant) => {
    navigation.navigate('RestaurantDetails', { restaurant });
  };

  const handleRemoveMatch = async (restaurantId: string) => {
    try {
      await firestoreService.removeSwipe(userId, restaurantId);
      setMatches((prev) => prev.filter((r) => r.id !== restaurantId));
    } catch (error) {
      console.error('Error removing match:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.gold} />
        <Text style={styles.loadingText}>Loading your matches...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Matches</Text>
        <Text style={styles.headerSubtitle}>
          {matches.length} {matches.length === 1 ? 'restaurant' : 'restaurants'} you loved
        </Text>
      </View>

      {matches.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={80} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No Matches Yet</Text>
          <Text style={styles.emptyText}>
            Start swiping to discover restaurants you'll love!
          </Text>
          <TouchableOpacity
            style={styles.discoverButton}
            onPress={() => navigation.navigate('Swipe')}
          >
            <Ionicons name="restaurant" size={20} color={Colors.background} />
            <Text style={styles.discoverButtonText}>Discover Restaurants</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.gold}
              colors={[Colors.gold]}
            />
          }
        >
          {matches.map((restaurant) => (
            <TouchableOpacity
              key={restaurant.id}
              style={styles.matchCard}
              onPress={() => handleRestaurantPress(restaurant)}
              activeOpacity={0.9}
            >
              <Image
                source={{
                  uri: restaurant.photos?.[0] || 'https://via.placeholder.com/400x200',
                }}
                style={styles.matchImage}
                resizeMode="cover"
              />

              <View style={styles.matchInfo}>
                <View style={styles.matchHeader}>
                  <View style={styles.matchHeaderLeft}>
                    <Text style={styles.matchName} numberOfLines={1}>
                      {restaurant.name}
                    </Text>
                    <View style={styles.ratingRow}>
                      <Ionicons name="star" size={16} color={Colors.gold} />
                      <Text style={styles.ratingText}>
                        {restaurant.rating.toFixed(1)}
                      </Text>
                      <Text style={styles.reviewCount}>
                        ({restaurant.reviewCount})
                      </Text>
                      <Text style={styles.priceLevel}>{restaurant.priceLevel}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveMatch(restaurant.id)}
                  >
                    <Ionicons name="close-circle" size={28} color={Colors.error} />
                  </TouchableOpacity>
                </View>

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

                <View style={styles.addressRow}>
                  <Ionicons name="location" size={14} color={Colors.textMuted} />
                  <Text style={styles.addressText} numberOfLines={1}>
                    {restaurant.address}
                  </Text>
                </View>

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
                      {restaurant.openingHours.open_now ? 'Open Now' : 'Closed'}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </View>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontFamily: 'PlayfairDisplay_900Black',
    fontSize: 36,
    color: Colors.textLight,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 28,
    color: Colors.textLight,
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  discoverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gold,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  discoverButtonText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: Colors.background,
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  matchCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  matchImage: {
    width: '100%',
    height: 180,
    backgroundColor: Colors.card,
  },
  matchInfo: {
    padding: 16,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  matchHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  matchName: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 22,
    color: Colors.textLight,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: Colors.textLight,
  },
  reviewCount: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  priceLevel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: Colors.gold,
    marginLeft: 8,
  },
  removeButton: {
    padding: 4,
  },
  cuisineContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  cuisineTag: {
    backgroundColor: Colors.gold,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cuisineText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 12,
    color: Colors.background,
    textTransform: 'capitalize',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  addressText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textMuted,
    flex: 1,
  },
  openStatus: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  openNow: {
    backgroundColor: Colors.success,
  },
  closed: {
    backgroundColor: Colors.error,
  },
  openStatusText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 12,
    color: Colors.textLight,
  },
  bottomSpacer: {
    height: 20,
  },
});
