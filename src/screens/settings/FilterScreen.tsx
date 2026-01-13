import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  TextInput,
  Alert,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import Slider from '@react-native-community/slider';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { FilterOptions, PriceRange, DietaryRestriction } from '../../types';
import { Colors } from '../../constants/colors';
import { googlePlacesService } from '../../services/api/googlePlaces.service';

interface FilterScreenProps {
  navigation: any;
  currentFilters: FilterOptions;
  onApplyFilters: (filters: FilterOptions) => void;
}

const CUISINES = [
  'Italian',
  'Mexican',
  'Chinese',
  'Japanese',
  'Indian',
  'Thai',
  'American',
  'Mediterranean',
  'Korean',
  'Vietnamese',
  'French',
  'Greek',
];

const DIETARY_OPTIONS: Array<DietaryRestriction['type']> = [
  'vegetarian',
  'vegan',
  'halal',
  'kosher',
  'gluten-free',
  'dairy-free',
  'nut-free',
];

export const FilterScreen: React.FC<FilterScreenProps> = ({
  navigation,
  currentFilters,
  onApplyFilters,
}) => {
  const [filters, setFilters] = useState<FilterOptions>(currentFilters);
  const [locationText, setLocationText] = useState('Current Location');
  const [locationInput, setLocationInput] = useState('');
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Fetch autocomplete suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (locationInput.trim().length < 3) {
        setSuggestions([]);
        return;
      }

      try {
        setLoadingSuggestions(true);
        const results = await googlePlacesService.autocomplete(locationInput);
        setSuggestions(results);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    };

    // Debounce the search
    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [locationInput]);

  const toggleCuisine = (cuisine: string) => {
    setFilters((prev) => ({
      ...prev,
      cuisines: prev.cuisines.includes(cuisine)
        ? prev.cuisines.filter((c) => c !== cuisine)
        : [...prev.cuisines, cuisine],
    }));
  };

  const togglePriceRange = (price: PriceRange) => {
    setFilters((prev) => ({
      ...prev,
      priceRange: prev.priceRange.includes(price)
        ? prev.priceRange.filter((p) => p !== price)
        : [...prev.priceRange, price],
    }));
  };

  const toggleDietaryRestriction = (type: DietaryRestriction['type']) => {
    setFilters((prev) => {
      const exists = prev.dietaryRestrictions.find((d) => d.type === type);
      if (exists) {
        return {
          ...prev,
          dietaryRestrictions: prev.dietaryRestrictions.filter(
            (d) => d.type !== type
          ),
        };
      } else {
        return {
          ...prev,
          dietaryRestrictions: [
            ...prev.dietaryRestrictions,
            { type, strict: true },
          ],
        };
      }
    });
  };

  const handleApply = () => {
    onApplyFilters(filters);
    navigation.goBack();
  };

  const handleReset = () => {
    setFilters({
      cuisines: [],
      priceRange: ['$', '$$', '$$$', '$$$$'],
      radius: 5000,
      dietaryRestrictions: [],
      allergies: [],
      openNow: false,
    });
    setLocationText('Current Location');
    setLocationInput('');
    setShowLocationInput(false);
  };

  const handleUseCurrentLocation = async () => {
    try {
      setLoadingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable location services to use this feature');
        setLoadingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Update filters with location
      setFilters((prev) => ({
        ...prev,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
      }));

      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address && address[0]) {
        const { city, region } = address[0];
        setLocationText(`${city || 'Unknown'}, ${region || 'Unknown'}`);
      } else {
        setLocationText('Current Location');
      }

      setShowLocationInput(false);
      setLoadingLocation(false);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get current location');
      setLoadingLocation(false);
    }
  };

  const handleSelectSuggestion = async (suggestion: any) => {
    try {
      setLoadingLocation(true);
      setSuggestions([]);

      // Get place details using place_id
      const geocoded = await Location.geocodeAsync(suggestion.description);

      if (geocoded && geocoded.length > 0) {
        const { latitude, longitude } = geocoded[0];

        // Update filters with the new location
        setFilters((prev) => ({
          ...prev,
          location: {
            latitude,
            longitude,
          },
        }));

        setLocationText(suggestion.description);
        setShowLocationInput(false);
        setLocationInput('');
      } else {
        Alert.alert('Error', 'Location not found. Please try a different search.');
      }

      setLoadingLocation(false);
    } catch (error) {
      console.error('Error selecting location:', error);
      Alert.alert('Error', 'Failed to select location. Please try again.');
      setLoadingLocation(false);
    }
  };

  const handleSearchLocation = async () => {
    if (!locationInput.trim()) {
      Alert.alert('Error', 'Please enter a location');
      return;
    }

    try {
      setLoadingLocation(true);

      // Use Location.geocodeAsync to convert address to coordinates
      const geocoded = await Location.geocodeAsync(locationInput);

      if (geocoded && geocoded.length > 0) {
        const { latitude, longitude } = geocoded[0];

        // Update filters with the new location
        setFilters((prev) => ({
          ...prev,
          location: {
            latitude,
            longitude,
          },
        }));

        setLocationText(locationInput);
        setShowLocationInput(false);
        setLocationInput('');
        setSuggestions([]);
      } else {
        Alert.alert('Error', 'Location not found. Please try a different search.');
      }

      setLoadingLocation(false);
    } catch (error) {
      console.error('Error searching location:', error);
      Alert.alert('Error', 'Failed to search location. Please try again.');
      setLoadingLocation(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Filters</Text>
        <TouchableOpacity onPress={handleReset}>
          <Text style={styles.headerButton}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>

          {/* Current Location Display */}
          <View style={styles.locationDisplay}>
            <Ionicons name="location" size={20} color={Colors.gold} />
            <Text style={styles.locationText}>
              {loadingLocation ? 'Getting location...' : locationText}
            </Text>
          </View>

          {/* Location Buttons */}
          <View style={styles.locationButtonsRow}>
            <TouchableOpacity
              style={[styles.locationActionButton, styles.locationActionButtonPrimary]}
              onPress={handleUseCurrentLocation}
              disabled={loadingLocation}
            >
              <Ionicons name="navigate" size={18} color={Colors.background} />
              <Text style={styles.locationActionButtonText}>Use Current</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.locationActionButton, styles.locationActionButtonSecondary]}
              onPress={() => setShowLocationInput(!showLocationInput)}
              disabled={loadingLocation}
            >
              <Ionicons name="search" size={18} color={Colors.gold} />
              <Text style={styles.locationActionButtonTextSecondary}>Search Location</Text>
            </TouchableOpacity>
          </View>

          {/* Location Search Input */}
          {showLocationInput && (
            <View>
              <View style={styles.locationSearchContainer}>
                <TextInput
                  style={styles.locationInput}
                  placeholder="Enter city or address..."
                  placeholderTextColor={Colors.textMuted}
                  value={locationInput}
                  onChangeText={setLocationInput}
                  autoCapitalize="words"
                  returnKeyType="search"
                  onSubmitEditing={handleSearchLocation}
                />
                <TouchableOpacity
                  style={styles.searchButton}
                  onPress={handleSearchLocation}
                  disabled={loadingLocation}
                >
                  <Ionicons name="arrow-forward" size={20} color={Colors.background} />
                </TouchableOpacity>
              </View>

              {/* Autocomplete Suggestions */}
              {locationInput.length >= 3 && (
                <View style={styles.suggestionsContainer}>
                  {loadingSuggestions ? (
                    <View style={styles.suggestionItem}>
                      <ActivityIndicator size="small" color={Colors.gold} />
                      <Text style={styles.suggestionText}>Searching...</Text>
                    </View>
                  ) : suggestions.length > 0 ? (
                    <FlatList
                      data={suggestions}
                      keyExtractor={(item) => item.place_id}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.suggestionItem}
                          onPress={() => handleSelectSuggestion(item)}
                        >
                          <Ionicons name="location-outline" size={20} color={Colors.gold} />
                          <Text style={styles.suggestionText} numberOfLines={1}>
                            {item.description}
                          </Text>
                        </TouchableOpacity>
                      )}
                      style={styles.suggestionsList}
                      scrollEnabled={false}
                    />
                  ) : locationInput.length >= 3 ? (
                    <View style={styles.suggestionItem}>
                      <Text style={styles.suggestionText}>No suggestions found</Text>
                    </View>
                  ) : null}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Distance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Distance</Text>
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>
              {(filters.radius / 1000).toFixed(1)} km
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={1000}
              maximumValue={50000}
              step={1000}
              value={filters.radius}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, radius: value }))
              }
              minimumTrackTintColor={Colors.gold}
              maximumTrackTintColor={Colors.border}
            />
          </View>
        </View>

        {/* Price Range */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price Range</Text>
          <View style={styles.chipContainer}>
            {(['$', '$$', '$$$', '$$$$'] as PriceRange[]).map((price) => (
              <TouchableOpacity
                key={price}
                style={[
                  styles.chip,
                  filters.priceRange.includes(price) && styles.chipSelected,
                ]}
                onPress={() => togglePriceRange(price)}
              >
                <Text
                  style={[
                    styles.chipText,
                    filters.priceRange.includes(price) &&
                      styles.chipTextSelected,
                  ]}
                >
                  {price}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Cuisines */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cuisines</Text>
          <View style={styles.chipContainer}>
            {CUISINES.map((cuisine) => (
              <TouchableOpacity
                key={cuisine}
                style={[
                  styles.chip,
                  filters.cuisines.includes(cuisine) && styles.chipSelected,
                ]}
                onPress={() => toggleCuisine(cuisine)}
              >
                <Text
                  style={[
                    styles.chipText,
                    filters.cuisines.includes(cuisine) &&
                      styles.chipTextSelected,
                  ]}
                >
                  {cuisine}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Dietary Restrictions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dietary Restrictions</Text>
          <View style={styles.chipContainer}>
            {DIETARY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.chip,
                  filters.dietaryRestrictions.some((d) => d.type === option) &&
                    styles.chipSelected,
                ]}
                onPress={() => toggleDietaryRestriction(option)}
              >
                <Text
                  style={[
                    styles.chipText,
                    filters.dietaryRestrictions.some(
                      (d) => d.type === option
                    ) && styles.chipTextSelected,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Other Options */}
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Open Now</Text>
            <Switch
              value={filters.openNow}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, openNow: value }))
              }
              trackColor={{ false: Colors.border, true: Colors.gold }}
              thumbColor={Colors.textLight}
            />
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
          <Text style={styles.applyButtonText}>Apply Filters</Text>
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  headerButton: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 16,
    color: Colors.gold,
  },
  headerTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 20,
    color: Colors.textLight,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  sectionTitle: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 18,
    color: Colors.textLight,
    marginBottom: 15,
  },
  locationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  locationText: {
    fontFamily: 'DMSans_500Medium',
    flex: 1,
    fontSize: 16,
    color: Colors.textLight,
  },
  locationButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  locationActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  locationActionButtonPrimary: {
    backgroundColor: Colors.gold,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  locationActionButtonSecondary: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  locationActionButtonText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: Colors.background,
  },
  locationActionButtonTextSecondary: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 14,
    color: Colors.gold,
  },
  locationSearchContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  locationInput: {
    flex: 1,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    color: Colors.textLight,
  },
  searchButton: {
    backgroundColor: Colors.gold,
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sliderContainer: {
    gap: 10,
  },
  sliderLabel: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 18,
    color: Colors.gold,
    textAlign: 'center',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  chipSelected: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  chipText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  chipTextSelected: {
    fontFamily: 'DMSans_700Bold',
    color: Colors.background,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    color: Colors.textLight,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  applyButton: {
    backgroundColor: Colors.gold,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  applyButtonText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 18,
    color: Colors.background,
    letterSpacing: 0.5,
  },
  suggestionsContainer: {
    marginTop: 8,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 250,
    overflow: 'hidden',
  },
  suggestionsList: {
    flexGrow: 0,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  suggestionText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 15,
    color: Colors.textLight,
    flex: 1,
  },
});
