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
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [friends, setFriends] = useState<Array<{ id: string; displayName: string; email: string; photoURL?: string }>>([]);
  const [showLocationFilter, setShowLocationFilter] = useState(false);
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());

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

  // Parse address into geographic components with improved accuracy
  const parseAddress = (address: string): { city: string; state: string; country: string } => {
    const parts = address.split(',').map(p => p.trim());

    let city = 'Unknown';
    let state = '';
    let country = 'Unknown';

    // US state codes (uppercase for consistency)
    const usStateCodes = new Set([
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
      'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
      'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
      'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
      'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
    ]);

    // Full country names for explicit matching
    const countryNames = new Set([
      'india', 'canada', 'united states', 'usa', 'united kingdom', 'uk',
      'australia', 'france', 'germany', 'italy', 'spain', 'mexico',
      'china', 'japan', 'brazil', 'argentina', 'south korea', 'singapore'
    ]);

    // State/Province patterns by country
    const statePatterns: { [key: string]: string[] } = {
      'Canada': ['ontario', 'quebec', 'british columbia', 'alberta', 'manitoba', 'saskatchewan', 'nova scotia', 'new brunswick', 'bc', 'on', 'qc', 'ab'],
      'India': ['maharashtra', 'delhi', 'karnataka', 'tamil nadu', 'uttar pradesh', 'gujarat', 'west bengal', 'rajasthan', 'telangana'],
      'Australia': ['new south wales', 'victoria', 'queensland', 'western australia', 'south australia', 'tasmania', 'nsw', 'vic', 'qld', 'wa', 'sa'],
    };

    if (parts.length === 0) {
      return { city, state, country };
    }

    // Start from the end and work backwards
    const lastPart = parts[parts.length - 1].replace(/\d+/g, '').trim();
    const lastPartLower = lastPart.toLowerCase();

    // Check if last part is a US state code (2 letters)
    const lastPartUpper = lastPart.toUpperCase();
    if (usStateCodes.has(lastPartUpper) && lastPart.length === 2) {
      country = 'United States';
      state = lastPartUpper;
      if (parts.length >= 2) {
        city = parts[parts.length - 2].replace(/\d+/g, '').trim();
      }
      return { city, state, country };
    }

    // Check if last part is explicitly a country name
    if (countryNames.has(lastPartLower)) {
      if (lastPartLower === 'usa' || lastPartLower === 'united states') {
        country = 'United States';
      } else if (lastPartLower === 'uk' || lastPartLower === 'united kingdom') {
        country = 'United Kingdom';
      } else {
        country = lastPart; // Capitalize first letter properly
        country = country.charAt(0).toUpperCase() + country.slice(1).toLowerCase();
      }

      if (parts.length >= 2) {
        const secondLast = parts[parts.length - 2].replace(/\d+/g, '').trim();

        // Check if second-to-last is a state/province for this country
        if (country === 'United States' && usStateCodes.has(secondLast.toUpperCase()) && secondLast.length === 2) {
          state = secondLast.toUpperCase();
          if (parts.length >= 3) {
            city = parts[parts.length - 3].replace(/\d+/g, '').trim();
          }
        } else if (statePatterns[country]) {
          const stateMatch = statePatterns[country].find(s => secondLast.toLowerCase().includes(s));
          if (stateMatch) {
            state = secondLast;
            if (parts.length >= 3) {
              city = parts[parts.length - 3].replace(/\d+/g, '').trim();
            }
          } else {
            city = secondLast;
          }
        } else {
          city = secondLast;
        }
      }
      return { city, state, country };
    }

    // Check if last part matches a state/province pattern
    for (const [countryKey, patterns] of Object.entries(statePatterns)) {
      const matchedPattern = patterns.find(p => lastPartLower.includes(p) || lastPartLower === p);
      if (matchedPattern) {
        country = countryKey;
        state = lastPart;
        if (parts.length >= 2) {
          city = parts[parts.length - 2].replace(/\d+/g, '').trim();
        }
        return { city, state, country };
      }
    }

    // Default: assume US format "Street, City, State ZIP"
    if (parts.length >= 3) {
      // Try to extract state code from last part (might include ZIP)
      const stateMatch = lastPart.match(/\b([A-Z]{2})\b/);
      if (stateMatch && usStateCodes.has(stateMatch[1])) {
        country = 'United States';
        state = stateMatch[1];
        city = parts[parts.length - 2].replace(/\d+/g, '').trim();
      } else {
        // Unknown format - use last as country, second-to-last as city
        city = parts[parts.length - 2].replace(/\d+/g, '').trim();
        country = 'Other';
      }
    } else if (parts.length === 2) {
      city = parts[0].replace(/\d+/g, '').trim();
      country = 'Other';
    } else {
      city = parts[0].replace(/\d+/g, '').trim();
      country = 'Other';
    }

    return { city, state, country };
  };

  // Create hierarchical location string
  const getLocationHierarchy = (address: string): string => {
    const { city, state, country } = parseAddress(address);

    // For addresses with states/provinces
    if (state && state !== country) {
      return `${city}, ${state}, ${country}`;
    }

    // For addresses without state
    return `${city}, ${country}`;
  };

  // Build hierarchical location structure
  interface LocationHierarchy {
    countries: Map<string, {
      states: Map<string, {
        cities: Set<string>;
        fullLocations: string[];
      }>;
    }>;
  }

  const buildLocationHierarchy = (): LocationHierarchy => {
    const hierarchy: LocationHierarchy = {
      countries: new Map(),
    };

    allMatches.forEach((restaurant) => {
      const { city, state, country } = parseAddress(restaurant.address);
      const fullLocation = getLocationHierarchy(restaurant.address);

      if (!hierarchy.countries.has(country)) {
        hierarchy.countries.set(country, { states: new Map() });
      }

      const countryData = hierarchy.countries.get(country)!;

      if (state && state !== country) {
        // Has a state/province
        if (!countryData.states.has(state)) {
          countryData.states.set(state, { cities: new Set(), fullLocations: [] });
        }
        const stateData = countryData.states.get(state)!;
        stateData.cities.add(city);
        if (!stateData.fullLocations.includes(fullLocation)) {
          stateData.fullLocations.push(fullLocation);
        }
      } else {
        // Direct city without state
        if (!countryData.states.has('_direct')) {
          countryData.states.set('_direct', { cities: new Set(), fullLocations: [] });
        }
        const directData = countryData.states.get('_direct')!;
        directData.cities.add(city);
        if (!directData.fullLocations.includes(fullLocation)) {
          directData.fullLocations.push(fullLocation);
        }
      }
    });

    return hierarchy;
  };

  // Get count of restaurants for a country
  const getCountryRestaurantCount = (country: string): number => {
    return allMatches.filter((restaurant) => {
      const { country: restaurantCountry } = parseAddress(restaurant.address);
      return restaurantCountry === country;
    }).length;
  };

  // Get count of restaurants for a state
  const getStateRestaurantCount = (country: string, state: string): number => {
    return allMatches.filter((restaurant) => {
      const { country: restaurantCountry, state: restaurantState } = parseAddress(restaurant.address);
      return restaurantCountry === country && restaurantState === state;
    }).length;
  };

  const toggleLocation = (location: string) => {
    setSelectedLocations((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(location)) {
        newSet.delete(location);
      } else {
        newSet.add(location);
      }
      return newSet;
    });
  };

  const toggleCountry = (country: string) => {
    setExpandedCountries((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(country)) {
        newSet.delete(country);
      } else {
        newSet.add(country);
      }
      return newSet;
    });
  };

  const toggleState = (stateKey: string) => {
    setExpandedStates((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(stateKey)) {
        newSet.delete(stateKey);
      } else {
        newSet.add(stateKey);
      }
      return newSet;
    });
  };

  const clearAllFilters = () => {
    setSelectedLocations(new Set());
  };

  const selectAllInSection = (locations: string[]) => {
    setSelectedLocations((prev) => {
      const newSet = new Set(prev);
      locations.forEach((loc) => newSet.add(loc));
      return newSet;
    });
  };

  // Apply filtering based on selected locations
  useEffect(() => {
    if (selectedLocations.size === 0) {
      setMatches(allMatches);
    } else {
      const filtered = allMatches.filter((restaurant) => {
        const restaurantLocation = getLocationHierarchy(restaurant.address);
        return selectedLocations.has(restaurantLocation);
      });
      setMatches(filtered);
    }
  }, [selectedLocations, allMatches]);

  // Group restaurants by location for display
  const groupedRestaurants = useMemo(() => {
    if (selectedLocations.size === 0) {
      const grouped = new Map<string, Restaurant[]>();

      matches.forEach((restaurant) => {
        const location = getLocationHierarchy(restaurant.address);

        if (!grouped.has(location)) {
          grouped.set(location, []);
        }
        grouped.get(location)!.push(restaurant);
      });

      // Convert to section list format and sort
      return Array.from(grouped.entries())
        .map(([location, restaurants]) => ({
          title: location,
          data: restaurants,
        }))
        .sort((a, b) => {
          // Sort by restaurant count (descending), then alphabetically
          if (b.data.length !== a.data.length) {
            return b.data.length - a.data.length;
          }
          return a.title.localeCompare(b.title);
        });
    } else {
      // Multiple sections when filtered
      const grouped = new Map<string, Restaurant[]>();

      matches.forEach((restaurant) => {
        const location = getLocationHierarchy(restaurant.address);

        if (!grouped.has(location)) {
          grouped.set(location, []);
        }
        grouped.get(location)!.push(restaurant);
      });

      return Array.from(grouped.entries())
        .map(([location, restaurants]) => ({
          title: location,
          data: restaurants,
        }))
        .sort((a, b) => {
          if (b.data.length !== a.data.length) {
            return b.data.length - a.data.length;
          }
          return a.title.localeCompare(b.title);
        });
    }
  }, [matches, selectedLocations]);

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
      <LinearGradient
        colors={[Colors.primaryDark, Colors.background, Colors.surface]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Your Matches</Text>
          <View style={styles.matchCountBadge}>
            <LinearGradient
              colors={[Colors.accent, Colors.accentLight]}
              style={styles.badgeGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="heart" size={16} color={Colors.primaryDark} />
              <Text style={styles.matchCountText}>
                {matches.length} {matches.length === 1 ? 'match' : 'matches'}
              </Text>
            </LinearGradient>
          </View>
        </View>
      </LinearGradient>

      {allMatches.length > 0 && (
        <View style={styles.filterSection}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowLocationFilter(!showLocationFilter)}
          >
            <View style={styles.filterButtonLeft}>
              <View style={styles.dropdownIconContainer}>
                <Ionicons name="filter" size={18} color={Colors.gold} />
              </View>
              <Text style={styles.filterButtonText}>
                {selectedLocations.size === 0
                  ? 'Filter by Location'
                  : `${selectedLocations.size} location${selectedLocations.size === 1 ? '' : 's'} selected`}
              </Text>
            </View>
            <Ionicons
              name={showLocationFilter ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>

          {showLocationFilter && (
            <View style={styles.filterPanel}>
              <View style={styles.filterHeader}>
                <Text style={styles.filterHeaderTitle}>Select Locations</Text>
                {selectedLocations.size > 0 && (
                  <TouchableOpacity onPress={clearAllFilters} style={styles.clearButton}>
                    <Text style={styles.clearButtonText}>Clear All</Text>
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView style={styles.filterScroll} nestedScrollEnabled={true}>
                {Array.from(buildLocationHierarchy().countries.entries())
                  .sort((a, b) => {
                    // Sort by restaurant count (descending), then alphabetically
                    const countA = getCountryRestaurantCount(a[0]);
                    const countB = getCountryRestaurantCount(b[0]);
                    if (countB !== countA) return countB - countA;
                    return a[0].localeCompare(b[0]);
                  })
                  .map(([country, countryData]) => {
                    const isCountryExpanded = expandedCountries.has(country);
                    const restaurantCount = getCountryRestaurantCount(country);

                    return (
                      <View key={country} style={styles.hierarchySection}>
                        {/* Country Header */}
                        <TouchableOpacity
                          style={styles.hierarchyHeader}
                          onPress={() => toggleCountry(country)}
                        >
                          <View style={styles.hierarchyHeaderLeft}>
                            <Ionicons
                              name={isCountryExpanded ? 'chevron-down' : 'chevron-forward'}
                              size={20}
                              color={Colors.gold}
                            />
                            <Ionicons name="earth" size={18} color={Colors.gold} />
                            <Text style={styles.hierarchyHeaderText}>{country}</Text>
                          </View>
                          <Text style={styles.countBadge}>{restaurantCount}</Text>
                        </TouchableOpacity>

                        {/* States */}
                        {isCountryExpanded && (
                          <>
                            {countryData.states.size === 0 ? (
                              <View style={styles.emptyStateContainer}>
                                <Text style={styles.emptyStateText}>
                                  No restaurants have been liked from here :/
                                </Text>
                              </View>
                            ) : (
                              Array.from(countryData.states.entries())
                                .sort((a, b) => {
                                  // Direct cities first, then sort states
                                  if (a[0] === '_direct') return -1;
                                  if (b[0] === '_direct') return 1;
                                  return a[0].localeCompare(b[0]);
                                })
                                .map(([state, stateData]) => {
                                  const stateKey = `${country}-${state}`;
                                  const isStateExpanded = expandedStates.has(stateKey);
                                  const isDirect = state === '_direct';

                                  if (isDirect) {
                                    // Direct cities without state grouping
                                    return (
                                      <View key={stateKey} style={styles.cityList}>
                                        {stateData.fullLocations
                                          .sort((a, b) => a.localeCompare(b))
                                          .map((location) => (
                                            <TouchableOpacity
                                              key={location}
                                              style={styles.checkboxItem}
                                              onPress={() => toggleLocation(location)}
                                            >
                                              <View style={styles.checkboxContainer}>
                                                <View
                                                  style={[
                                                    styles.checkbox,
                                                    selectedLocations.has(location) &&
                                                      styles.checkboxChecked,
                                                  ]}
                                                >
                                                  {selectedLocations.has(location) && (
                                                    <Ionicons
                                                      name="checkmark"
                                                      size={16}
                                                      color={Colors.background}
                                                    />
                                                  )}
                                                </View>
                                                <Text style={styles.checkboxLabel}>{location}</Text>
                                              </View>
                                            </TouchableOpacity>
                                          ))}
                                      </View>
                                    );
                                  }

                                  const stateCount = getStateRestaurantCount(country, state);

                                  return (
                                    <View key={stateKey} style={styles.stateSection}>
                                      {/* State Header */}
                                      <TouchableOpacity
                                        style={styles.stateHeader}
                                        onPress={() => toggleState(stateKey)}
                                      >
                                        <View style={styles.hierarchyHeaderLeft}>
                                          <Ionicons
                                            name={isStateExpanded ? 'chevron-down' : 'chevron-forward'}
                                            size={18}
                                            color={Colors.textSecondary}
                                          />
                                          <Ionicons name="map" size={16} color={Colors.textSecondary} />
                                          <Text style={styles.stateHeaderText}>{state}</Text>
                                        </View>
                                        <Text style={styles.countBadgeSmall}>{stateCount}</Text>
                                      </TouchableOpacity>

                                      {/* Cities */}
                                      {isStateExpanded && (
                                        <View style={styles.cityList}>
                                          {stateData.fullLocations
                                            .sort((a, b) => a.localeCompare(b))
                                            .map((location) => (
                                              <TouchableOpacity
                                                key={location}
                                                style={styles.checkboxItem}
                                                onPress={() => toggleLocation(location)}
                                              >
                                                <View style={styles.checkboxContainer}>
                                                  <View
                                                    style={[
                                                      styles.checkbox,
                                                      selectedLocations.has(location) &&
                                                        styles.checkboxChecked,
                                                    ]}
                                                  >
                                                    {selectedLocations.has(location) && (
                                                      <Ionicons
                                                        name="checkmark"
                                                        size={16}
                                                        color={Colors.background}
                                                      />
                                                    )}
                                                  </View>
                                                  <Text style={styles.checkboxLabel}>{location}</Text>
                                                </View>
                                              </TouchableOpacity>
                                            ))}
                                        </View>
                                      )}
                                    </View>
                                  );
                                })
                            )}
                          </>
                        )}
                      </View>
                    );
                  })}
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
            <View style={styles.cardWrapper}>
              <TouchableOpacity
                style={styles.modernMatchCard}
                onPress={() => handleRestaurantPress(restaurant)}
                activeOpacity={0.95}
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
    paddingTop: 60,
    paddingBottom: 24,
  },
  headerContent: {
    gap: 16,
  },
  headerTitle: {
    fontFamily: 'PlayfairDisplay_900Black',
    fontSize: 40,
    color: Colors.textLight,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
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
    color: Colors.primaryDark,
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
    color: Colors.textLight,
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
  hierarchySection: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  hierarchyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
  },
  hierarchyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  hierarchyHeaderText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: Colors.textLight,
  },
  countBadge: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: Colors.gold,
    backgroundColor: Colors.card,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 28,
    textAlign: 'center',
  },
  countBadgeSmall: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 13,
    color: Colors.textSecondary,
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 24,
    textAlign: 'center',
  },
  emptyStateContainer: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    backgroundColor: Colors.card,
    alignItems: 'center',
  },
  emptyStateText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  stateSection: {
    backgroundColor: Colors.card,
  },
  stateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Colors.card,
  },
  stateHeaderText: {
    fontFamily: 'DMSans_600SemiBold',
    fontSize: 15,
    color: Colors.textLight,
  },
  cityList: {
    backgroundColor: Colors.card,
  },
  checkboxItem: {
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  },
  checkboxChecked: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  checkboxLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.textLight,
    flex: 1,
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
