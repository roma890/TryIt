import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Share,
  Alert,
  Modal,
  FlatList,
  SectionList,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Restaurant } from '../../types';
import { firestoreService } from '../../services/firebase/firestore.service';
import { Colors } from '../../constants/colors';
import { doc, getDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase/config';

interface MatchesScreenProps {
  navigation: any;
  userId: string;
}

export const MatchesScreen: React.FC<MatchesScreenProps> = ({
  navigation,
  userId,
}) => {
  const [matches, setMatches] = useState<Restaurant[]>([]);
  const [allMatches, setAllMatches] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [friends, setFriends] = useState<Array<{ id: string; displayName: string; email: string; photoURL?: string }>>([]);
  const [showFilter, setShowFilter] = useState(false);

  // Simple filters: American/Non-American and Cuisine
  const [filterAmerican, setFilterAmerican] = useState(false);
  const [filterNonAmerican, setFilterNonAmerican] = useState(false);
  const [selectedCuisines, setSelectedCuisines] = useState<Set<string>>(new Set());

  // Check if restaurant is in the United States
  const isAmericanRestaurant = useCallback((restaurant: Restaurant): boolean => {
    const address = restaurant.address.toLowerCase();
    // Check for USA, US, or common US state patterns
    return address.includes('usa') ||
           address.includes('united states') ||
           /,\s*[a-z]{2}\s*\d{5}/.test(address); // Matches ", XX 12345" zip code pattern
  }, []);

  // Get all unique cuisines from matches - memoized for performance
  const allCuisines = useMemo(() => {
    const cuisineSet = new Set<string>();
    allMatches.forEach(restaurant => {
      restaurant.cuisine.forEach(c => cuisineSet.add(c));
    });
    return Array.from(cuisineSet).sort();
  }, [allMatches]);

  const toggleCuisine = useCallback((cuisine: string) => {
    setSelectedCuisines(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cuisine)) {
        newSet.delete(cuisine);
      } else {
        newSet.add(cuisine);
      }
      return newSet;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilterAmerican(false);
    setFilterNonAmerican(false);
    setSelectedCuisines(new Set());
  }, []);

  // Load matches from Firestore
  const loadMatches = useCallback(async () => {
    try {
      setLoading(true);
      const likedRestaurants = await firestoreService.getLikedRestaurants(userId);
      setAllMatches(likedRestaurants);
      setMatches(likedRestaurants);
      setLoading(false);
    } catch (error) {
      console.error('Error loading matches:', error);
      setLoading(false);
    }
  }, [userId]);

  // Load matches on mount
  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  // Apply filtering - optimized with useMemo instead of useEffect
  useEffect(() => {
    const filtered = allMatches.filter(restaurant => {
      // Country filter
      if (filterAmerican && !filterNonAmerican && !isAmericanRestaurant(restaurant)) return false;
      if (filterNonAmerican && !filterAmerican && isAmericanRestaurant(restaurant)) return false;

      // Cuisine filter
      if (selectedCuisines.size > 0 && !restaurant.cuisine.some(c => selectedCuisines.has(c))) return false;

      return true;
    });

    setMatches(filtered);
  }, [filterAmerican, filterNonAmerican, selectedCuisines, allMatches, isAmericanRestaurant]);

  // Group restaurants by cuisine for display
  const groupedRestaurants = useMemo(() => {
    const grouped = new Map<string, Restaurant[]>();

    matches.forEach((restaurant) => {
      const mainCuisine = restaurant.cuisine[0] || 'Other';
      if (!grouped.has(mainCuisine)) {
        grouped.set(mainCuisine, []);
      }
      grouped.get(mainCuisine)!.push(restaurant);
    });

    return Array.from(grouped.entries())
      .map(([cuisine, restaurants]) => ({
        title: cuisine,
        data: restaurants,
      }))
      .sort((a, b) => {
        if (b.data.length !== a.data.length) {
          return b.data.length - a.data.length;
        }
        return a.title.localeCompare(b.title);
      });
  }, [matches]);

  const handleShare = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    setShareModalVisible(true);
  };

  const handleShareExternal = async () => {
    if (!selectedRestaurant) return;

    try {
      await Share.share({
        message: `Check out ${selectedRestaurant.name}!\n\nRating: ${selectedRestaurant.rating}⭐\nAddress: ${selectedRestaurant.address}\n\nFound on FoodSwipe!`,
        title: `Share ${selectedRestaurant.name}`,
      });
      setShareModalVisible(false);
    } catch (error) {
      console.error('Error sharing restaurant:', error);
    }
  };

  const handleShareWithFriend = async (friendId: string, friendName: string) => {
    if (!selectedRestaurant) return;

    try {
      // Create a shared restaurant message in Firestore
      await addDoc(collection(db, 'sharedRestaurants'), {
        fromUserId: userId,
        toUserId: friendId,
        restaurantId: selectedRestaurant.id,
        restaurantName: selectedRestaurant.name,
        restaurantAddress: selectedRestaurant.address,
        restaurantRating: selectedRestaurant.rating,
        message: `Check out ${selectedRestaurant.name}!`,
        timestamp: Timestamp.now(),
        read: false,
      });

      Alert.alert('Success', `Shared with ${friendName}!`);
      setShareModalVisible(false);
    } catch (error) {
      console.error('Error sharing with friend:', error);
      Alert.alert('Error', 'Failed to share with friend');
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
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Your Matches</Text>
          <View style={styles.matchCountBadge}>
            <LinearGradient
              colors={[Colors.accent, Colors.accentLight]}
              style={styles.badgeGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="heart" size={16} color={Colors.textLight} />
              <Text style={styles.matchCountText}>
                {matches.length} {matches.length === 1 ? 'match' : 'matches'}
              </Text>
            </LinearGradient>
          </View>
        </View>
      </View>

      {allMatches.length > 0 && (
        <View style={styles.filterSection}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilter(!showFilter)}
          >
            <View style={styles.filterButtonLeft}>
              <View style={styles.dropdownIconContainer}>
                <Ionicons name="filter" size={18} color={Colors.gold} />
              </View>
              <Text style={styles.filterButtonText}>
                {!filterAmerican && !filterNonAmerican && selectedCuisines.size === 0
                  ? 'Filter Restaurants'
                  : `${(filterAmerican ? 1 : 0) + (filterNonAmerican ? 1 : 0) + selectedCuisines.size} filter${
                      (filterAmerican ? 1 : 0) + (filterNonAmerican ? 1 : 0) + selectedCuisines.size === 1 ? '' : 's'
                    } active`}
              </Text>
            </View>
            <Ionicons
              name={showFilter ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>

          {showFilter && (
            <View style={styles.filterPanel}>
              <View style={styles.filterHeader}>
                <Text style={styles.filterHeaderTitle}>Filter Restaurants</Text>
                {(filterAmerican || filterNonAmerican || selectedCuisines.size > 0) && (
                  <TouchableOpacity onPress={clearAllFilters} style={styles.clearButton}>
                    <Text style={styles.clearButtonText}>Clear All</Text>
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView style={styles.filterScroll} nestedScrollEnabled={true}>
                {/* Country Filters */}
                <View style={styles.filterGroup}>
                  <Text style={styles.filterGroupTitle}>Country</Text>
                  <TouchableOpacity
                    style={[
                      styles.filterToggle,
                      filterAmerican && styles.filterToggleActive,
                    ]}
                    onPress={() => setFilterAmerican(!filterAmerican)}
                  >
                    <View style={styles.filterToggleLeft}>
                      <Ionicons
                        name="flag"
                        size={18}
                        color={filterAmerican ? Colors.textLight : Colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.filterToggleText,
                          filterAmerican && styles.filterToggleTextActive,
                        ]}
                      >
                        American Restaurants
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.checkbox,
                        filterAmerican && styles.checkboxChecked,
                      ]}
                    >
                      {filterAmerican && (
                        <Ionicons name="checkmark" size={16} color={Colors.textLight} />
                      )}
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.filterToggle,
                      filterNonAmerican && styles.filterToggleActive,
                    ]}
                    onPress={() => setFilterNonAmerican(!filterNonAmerican)}
                  >
                    <View style={styles.filterToggleLeft}>
                      <Ionicons
                        name="earth"
                        size={18}
                        color={filterNonAmerican ? Colors.textLight : Colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.filterToggleText,
                          filterNonAmerican && styles.filterToggleTextActive,
                        ]}
                      >
                        Non-American Restaurants
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.checkbox,
                        filterNonAmerican && styles.checkboxChecked,
                      ]}
                    >
                      {filterNonAmerican && (
                        <Ionicons name="checkmark" size={16} color={Colors.textLight} />
                      )}
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Cuisine Filters */}
                {allCuisines.length > 0 && (
                  <View style={styles.filterGroup}>
                    <Text style={styles.filterGroupTitle}>Cuisine</Text>
                    {allCuisines.map((cuisine) => (
                      <TouchableOpacity
                        key={cuisine}
                        style={[
                          styles.filterToggle,
                          selectedCuisines.has(cuisine) && styles.filterToggleActive,
                        ]}
                        onPress={() => toggleCuisine(cuisine)}
                      >
                        <View style={styles.filterToggleLeft}>
                          <Ionicons
                            name="restaurant"
                            size={18}
                            color={
                              selectedCuisines.has(cuisine)
                                ? Colors.textLight
                                : Colors.textSecondary
                            }
                          />
                          <Text
                            style={[
                              styles.filterToggleText,
                              selectedCuisines.has(cuisine) &&
                                styles.filterToggleTextActive,
                            ]}
                          >
                            {cuisine}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.checkbox,
                            selectedCuisines.has(cuisine) && styles.checkboxChecked,
                          ]}
                        >
                          {selectedCuisines.has(cuisine) && (
                            <Ionicons name="checkmark" size={16} color={Colors.textLight} />
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {matches.length === 0 && allMatches.length > 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="filter-outline" size={80} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No restaurants match your filters</Text>
          <Text style={styles.emptyText}>
            Try adjusting your filters to see more restaurants
          </Text>
        </View>
      ) : matches.length === 0 ? (
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
        <SectionList
          sections={groupedRestaurants}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Ionicons name="location" size={20} color={Colors.gold} />
              <Text style={styles.sectionHeaderText}>
                {section.title} ({section.data.length})
              </Text>
            </View>
          )}
          renderItem={({ item: restaurant }) => (
            <View style={styles.cardWrapper}>
              <TouchableOpacity
                style={styles.modernMatchCard}
                onPress={() => handleRestaurantPress(restaurant)}
                activeOpacity={0.92}
              >
                <View style={styles.imageContainer}>
                  <Image
                    source={{
                      uri: restaurant.photos?.[0] || 'https://via.placeholder.com/400x200',
                    }}
                    style={styles.matchImage}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.7)']}
                    style={styles.imageGradient}
                  />
                  {restaurant.openingHours?.open_now !== undefined && (
                    <View
                      style={[
                        styles.modernOpenStatus,
                        restaurant.openingHours.open_now
                          ? styles.openNow
                          : styles.closed,
                      ]}
                    >
                      <View style={styles.statusDot} />
                      <Text style={styles.openStatusText}>
                        {restaurant.openingHours.open_now ? 'Open' : 'Closed'}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.modernMatchInfo}>
                  <View style={styles.matchHeaderRow}>
                    <View style={styles.matchHeaderLeft}>
                      <Text style={styles.modernMatchName} numberOfLines={1}>
                        {restaurant.name}
                      </Text>
                      <View style={styles.modernRatingRow}>
                        <View style={styles.ratingBadge}>
                          <Ionicons name="star" size={14} color={Colors.gold} />
                          <Text style={styles.ratingText}>
                            {restaurant.rating.toFixed(1)}
                          </Text>
                        </View>
                        <Text style={styles.reviewCount}>
                          {restaurant.reviewCount} reviews
                        </Text>
                        {restaurant.priceLevel && (
                          <Text style={styles.priceLevel}>{restaurant.priceLevel}</Text>
                        )}
                      </View>
                    </View>
                  </View>

                  {restaurant.cuisine && restaurant.cuisine.length > 0 && (
                    <View style={styles.modernCuisineContainer}>
                      {restaurant.cuisine.slice(0, 3).map((cuisine, index) => (
                        <View key={index} style={styles.modernCuisineTag}>
                          <Text style={styles.cuisineText}>
                            {cuisine.replace(/_/g, ' ')}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.addressRow}>
                    <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.modernAddressText} numberOfLines={1}>
                      {restaurant.address}
                    </Text>
                  </View>
                </View>

                <View style={styles.modernActionButtons}>
                  <TouchableOpacity
                    style={styles.modernActionButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleShare(restaurant);
                    }}
                  >
                    <LinearGradient
                      colors={[Colors.surface, Colors.card]}
                      style={styles.actionButtonGradient}
                    >
                      <Ionicons name="share-outline" size={20} color={Colors.gold} />
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modernActionButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleRemoveMatch(restaurant.id);
                    }}
                  >
                    <LinearGradient
                      colors={[Colors.surface, Colors.card]}
                      style={styles.actionButtonGradient}
                    >
                      <Ionicons name="heart-dislike-outline" size={20} color={Colors.error} />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>
          )}
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
          stickySectionHeadersEnabled={false}
        />
      )}

      {/* Share Modal */}
      <Modal
        visible={shareModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShareModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Share Restaurant</Text>
              <TouchableOpacity onPress={() => setShareModalVisible(false)}>
                <Ionicons name="close" size={28} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            {selectedRestaurant && (
              <View style={styles.restaurantPreview}>
                <Text style={styles.restaurantPreviewName}>{selectedRestaurant.name}</Text>
                <Text style={styles.restaurantPreviewAddress}>{selectedRestaurant.address}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.shareOptionButton}
              onPress={handleShareExternal}
            >
              <View style={styles.shareOptionIcon}>
                <Ionicons name="share-social" size={24} color={Colors.gold} />
              </View>
              <View style={styles.shareOptionText}>
                <Text style={styles.shareOptionTitle}>Share Externally</Text>
                <Text style={styles.shareOptionSubtitle}>
                  Share via Messages, Instagram, Snapchat, etc.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <Text style={styles.friendsListTitle}>Share with Friends</Text>

            {friends.length === 0 ? (
              <View style={styles.noFriendsContainer}>
                <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.noFriendsText}>No friends yet</Text>
                <Text style={styles.noFriendsSubtext}>Add friends to share restaurants with them!</Text>
              </View>
            ) : (
              <FlatList
                data={friends}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.friendShareItem}
                    onPress={() => handleShareWithFriend(item.id, item.displayName)}
                  >
                    <View style={styles.friendShareAvatar}>
                      {item.photoURL ? (
                        <Image source={{ uri: item.photoURL }} style={styles.friendShareAvatarImage} />
                      ) : (
                        <Ionicons name="person" size={24} color={Colors.gold} />
                      )}
                    </View>
                    <View style={styles.friendShareInfo}>
                      <Text style={styles.friendShareName}>{item.displayName}</Text>
                      <Text style={styles.friendShareEmail}>{item.email}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                  </TouchableOpacity>
                )}
                style={styles.friendsList}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: Colors.surface,
  },
  headerContent: {
    gap: 16,
  },
  headerTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 36,
    color: Colors.text,
    letterSpacing: 0.5,
  },
  matchCountBadge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  badgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  matchCountText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: Colors.textLight,
    letterSpacing: 0.5,
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
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 16,
    marginTop: 8,
    marginBottom: 12,
    gap: 10,
  },
  sectionHeaderText: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 20,
    color: Colors.gold,
    letterSpacing: 0.5,
  },
  cardWrapper: {
    marginBottom: 20,
  },
  modernMatchCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
  },
  matchImage: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.card,
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  modernMatchInfo: {
    padding: 20,
    paddingBottom: 16,
  },
  matchHeaderRow: {
    marginBottom: 14,
  },
  matchHeaderLeft: {
    flex: 1,
  },
  modernMatchName: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 24,
    color: Colors.textLight,
    marginBottom: 10,
    letterSpacing: 0.3,
    lineHeight: 30,
  },
  modernRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 5,
  },
  ratingText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: Colors.textLight,
  },
  reviewCount: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  priceLevel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 15,
    color: Colors.gold,
  },
  modernActionButtons: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 10,
    zIndex: 10,
  },
  modernActionButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionButtonGradient: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterSection: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: Colors.background,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  filterButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  filterButtonText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  dropdownIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterPanel: {
    marginTop: 12,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  filterHeaderTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: Colors.gold,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  clearButtonText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 14,
    color: Colors.error,
  },
  filterScroll: {
    maxHeight: 350,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0,
    shadowRadius: 4,
    elevation: 0,
  },
  checkboxChecked: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
    shadowOpacity: 0.4,
    elevation: 3,
  },
  checkboxLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  filterGroup: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterGroupTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterToggleActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  filterToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  filterToggleText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.text,
  },
  filterToggleTextActive: {
    fontFamily: 'DMSans_700Bold',
    color: Colors.textLight,
  },
  modernCuisineContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  modernCuisineTag: {
    backgroundColor: 'rgba(110, 231, 183, 0.15)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(110, 231, 183, 0.4)',
  },
  cuisineText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 12,
    color: Colors.gold,
    textTransform: 'capitalize',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modernAddressText: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  modernOpenStatus: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.textLight,
  },
  openNow: {
    backgroundColor: 'rgba(16, 185, 129, 0.95)',
  },
  closed: {
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
  },
  openStatusText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 12,
    color: Colors.textLight,
  },
  bottomSpacer: {
    height: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 24,
    color: Colors.gold,
  },
  restaurantPreview: {
    backgroundColor: Colors.card,
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  restaurantPreviewName: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 18,
    color: Colors.textLight,
    marginBottom: 4,
  },
  restaurantPreviewAddress: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  shareOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  shareOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  shareOptionText: {
    flex: 1,
  },
  shareOptionTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: Colors.textLight,
    marginBottom: 4,
  },
  shareOptionSubtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 20,
    marginHorizontal: 20,
  },
  friendsListTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: Colors.textLight,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  friendsList: {
    maxHeight: 300,
    paddingHorizontal: 20,
  },
  friendShareItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  friendShareAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: Colors.gold,
  },
  friendShareAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  friendShareInfo: {
    flex: 1,
  },
  friendShareName: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: Colors.textLight,
    marginBottom: 2,
  },
  friendShareEmail: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  noFriendsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noFriendsText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 18,
    color: Colors.textLight,
    marginTop: 16,
    marginBottom: 8,
  },
  noFriendsSubtext: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
