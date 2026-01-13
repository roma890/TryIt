import React, { useState, useEffect, useMemo } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  const [selectedLocation, setSelectedLocation] = useState<string>('All Locations');
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [friends, setFriends] = useState<Array<{ id: string; displayName: string; email: string; photoURL?: string }>>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  useEffect(() => {
    loadMatches();
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const friendIds = userDoc.data().friends || [];
        const friendsData = [];

        for (const friendId of friendIds) {
          const friendDoc = await getDoc(doc(db, 'users', friendId));
          if (friendDoc.exists()) {
            friendsData.push({
              id: friendDoc.id,
              displayName: friendDoc.data().displayName || 'Unknown',
              email: friendDoc.data().email || '',
              photoURL: friendDoc.data().photoURL,
            });
          }
        }

        setFriends(friendsData);
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const loadMatches = async () => {
    try {
      setLoading(true);
      const likedRestaurants = await firestoreService.getLikedRestaurants(userId);

      // Remove duplicates based on restaurant ID
      const uniqueRestaurants = likedRestaurants.filter(
        (restaurant, index, self) =>
          index === self.findIndex((r) => r.id === restaurant.id)
      );

      setAllMatches(uniqueRestaurants);
      setMatches(uniqueRestaurants);
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterByLocation = (location: string) => {
    setSelectedLocation(location);
    setShowLocationDropdown(false);

    if (location === 'All Locations') {
      setMatches(allMatches);
    } else {
      const filtered = allMatches.filter((restaurant) => {
        const addressParts = restaurant.address.split(',');
        let cityName = 'Unknown';

        if (addressParts.length >= 2) {
          const cityPart = addressParts[addressParts.length - 2]?.trim();
          cityName = cityPart.replace(/\d+/g, '').trim();
        } else if (addressParts.length > 0) {
          cityName = addressParts[0]?.trim();
        }

        const metroArea = getCityMetroArea(cityName);
        return metroArea === location;
      });
      setMatches(filtered);
    }
  };

  // Map smaller cities to their metro areas
  const getCityMetroArea = (city: string): string => {
    const metroAreas: { [key: string]: string[] } = {
      'San Francisco': ['San Francisco', 'SF', 'Oakland', 'Berkeley', 'San Mateo', 'Daly City', 'South San Francisco', 'Pacifica'],
      'San Jose': ['San Jose', 'Santa Clara', 'Sunnyvale', 'Mountain View', 'Cupertino', 'Milpitas', 'Los Gatos', 'Saratoga'],
      'Los Angeles': ['Los Angeles', 'LA', 'Santa Monica', 'Beverly Hills', 'West Hollywood', 'Culver City', 'Pasadena', 'Glendale', 'Burbank'],
      'New York': ['New York', 'NYC', 'Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island', 'Jersey City', 'Hoboken'],
      'Chicago': ['Chicago', 'Evanston', 'Oak Park', 'Cicero', 'Skokie'],
      'Seattle': ['Seattle', 'Bellevue', 'Redmond', 'Tacoma', 'Kirkland'],
      'Boston': ['Boston', 'Cambridge', 'Somerville', 'Brookline', 'Newton'],
      'Austin': ['Austin', 'Round Rock', 'Cedar Park', 'Pflugerville'],
      'Denver': ['Denver', 'Aurora', 'Lakewood', 'Thornton'],
      'Miami': ['Miami', 'Miami Beach', 'Coral Gables', 'Hialeah', 'Fort Lauderdale'],
    };

    const normalizedCity = city.trim();

    for (const [metro, cities] of Object.entries(metroAreas)) {
      if (cities.some(c => normalizedCity.toLowerCase().includes(c.toLowerCase()))) {
        return metro;
      }
    }

    return normalizedCity;
  };

  const getUniqueLocations = (): string[] => {
    const locationMap = new Map<string, number>();

    allMatches.forEach((restaurant) => {
      const addressParts = restaurant.address.split(',');
      // Get city name - typically second to last part in address format
      // Format: "Street, City, State ZIP"
      let cityName = 'Unknown';

      if (addressParts.length >= 2) {
        const cityPart = addressParts[addressParts.length - 2]?.trim();
        // Remove any numbers (ZIP codes) from the city part
        cityName = cityPart.replace(/\d+/g, '').trim();
      } else if (addressParts.length > 0) {
        cityName = addressParts[0]?.trim();
      }

      // Map to metro area
      const metroArea = getCityMetroArea(cityName);
      locationMap.set(metroArea, (locationMap.get(metroArea) || 0) + 1);
    });

    // Sort by count (most restaurants first)
    const sortedLocations = Array.from(locationMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([location]) => location);

    return ['All Locations', ...sortedLocations];
  };

  // Group restaurants by city for display
  const groupedRestaurants = useMemo(() => {
    if (selectedLocation === 'All Locations') {
      const grouped = new Map<string, Restaurant[]>();

      matches.forEach((restaurant) => {
        const addressParts = restaurant.address.split(',');
        let cityName = 'Unknown';

        if (addressParts.length >= 2) {
          const cityPart = addressParts[addressParts.length - 2]?.trim();
          cityName = cityPart.replace(/\d+/g, '').trim();
        } else if (addressParts.length > 0) {
          cityName = addressParts[0]?.trim();
        }

        const metroArea = getCityMetroArea(cityName);

        if (!grouped.has(metroArea)) {
          grouped.set(metroArea, []);
        }
        grouped.get(metroArea)!.push(restaurant);
      });

      // Convert to section list format
      return Array.from(grouped.entries())
        .map(([city, restaurants]) => ({
          title: city,
          data: restaurants,
        }))
        .sort((a, b) => b.data.length - a.data.length); // Sort by most restaurants
    } else {
      // Single section when filtered
      return [
        {
          title: selectedLocation,
          data: matches,
        },
      ];
    }
  }, [matches, selectedLocation]);

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
        <Text style={styles.headerTitle}>Your Matches</Text>
        <Text style={styles.headerSubtitle}>
          {matches.length} {matches.length === 1 ? 'restaurant' : 'restaurants'} you loved
        </Text>
      </View>

      {allMatches.length > 0 && (
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Filter by Location:</Text>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setShowLocationDropdown(!showLocationDropdown)}
          >
            <Ionicons name="location" size={20} color={Colors.gold} />
            <Text style={styles.dropdownButtonText}>{selectedLocation}</Text>
            <Ionicons
              name={showLocationDropdown ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={Colors.gold}
            />
          </TouchableOpacity>

          {showLocationDropdown && (
            <View style={styles.dropdownMenu}>
              <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                {getUniqueLocations().map((location) => (
                  <TouchableOpacity
                    key={location}
                    style={[
                      styles.dropdownItem,
                      selectedLocation === location && styles.dropdownItemSelected,
                    ]}
                    onPress={() => filterByLocation(location)}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        selectedLocation === location && styles.dropdownItemTextSelected,
                      ]}
                    >
                      {location}
                    </Text>
                    {selectedLocation === location && (
                      <Ionicons name="checkmark" size={20} color={Colors.gold} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {matches.length === 0 && allMatches.length > 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="location-outline" size={80} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No restaurants in this area</Text>
          <Text style={styles.emptyText}>
            Try selecting a different location filter
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
            <TouchableOpacity
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

                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.shareButton}
                      onPress={() => handleShare(restaurant)}
                    >
                      <Ionicons name="share-outline" size={24} color={Colors.gold} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveMatch(restaurant.id)}
                    >
                      <Ionicons name="close-circle" size={28} color={Colors.error} />
                    </TouchableOpacity>
                  </View>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: -16,
    marginTop: 8,
    marginBottom: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  sectionHeaderText: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 18,
    color: Colors.gold,
    letterSpacing: 0.5,
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
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareButton: {
    padding: 4,
  },
  removeButton: {
    padding: 4,
  },
  filterSection: {
    backgroundColor: Colors.surface,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterLabel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  dropdownButtonText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: Colors.gold,
    flex: 1,
  },
  dropdownMenu: {
    marginTop: 8,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 250,
    overflow: 'hidden',
  },
  dropdownScroll: {
    maxHeight: 250,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dropdownItemSelected: {
    backgroundColor: Colors.surface,
  },
  dropdownItemText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: Colors.textLight,
    flex: 1,
  },
  dropdownItemTextSelected: {
    fontFamily: 'DMSans_700Bold',
    color: Colors.gold,
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
