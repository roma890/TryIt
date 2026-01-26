import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SignUpScreen } from '../screens/auth/SignUpScreen';
import { SwipeScreen } from '../screens/main/SwipeScreen';
import { RestaurantDetailsScreen } from '../screens/main/RestaurantDetailsScreen';
import { MatchesScreen } from '../screens/main/MatchesScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { SocialFeedScreen } from '../screens/social/SocialFeedScreen';
import { FriendsScreen } from '../screens/social/FriendsScreen';
import { FilterScreen } from '../screens/settings/FilterScreen';
import { RootStackParamList, MainTabParamList, FilterOptions } from '../types';
import { Colors } from '../constants/colors';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

interface AppNavigatorProps {
  isAuthenticated: boolean;
  userId?: string;
  onLogin: (userId: string) => void;
  onSignUp: (userId: string) => void;
}

const MainTabs: React.FC<{ userId: string; filters: FilterOptions; onFiltersChange: (filters: FilterOptions) => void }> = ({ userId, filters, onFiltersChange }) => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.gold,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          paddingBottom: 8,
          paddingTop: 8,
          height: 65,
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          position: 'absolute',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontFamily: 'DMSans_500Medium',
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.3,
        },
      }}
    >
      <Tab.Screen
        name="Swipe"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "restaurant" : "restaurant-outline"}
              size={24}
              color={color}
            />
          ),
          tabBarLabel: 'Discover',
        }}
      >
        {(props) => <SwipeScreen {...props} userId={userId} filters={filters} onFiltersChange={onFiltersChange} />}
      </Tab.Screen>

      <Tab.Screen
        name="Social"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <MaterialCommunityIcons
              name={focused ? "image-multiple" : "image-multiple-outline"}
              size={24}
              color={color}
            />
          ),
          tabBarLabel: 'Feed',
        }}
      >
        {(props) => <SocialFeedScreen {...props} userId={userId} />}
      </Tab.Screen>

      <Tab.Screen
        name="Matches"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "heart" : "heart-outline"}
              size={24}
              color={color}
            />
          ),
          tabBarLabel: 'Matches',
        }}
      >
        {(props) => <MatchesScreen {...props} userId={userId} />}
      </Tab.Screen>

      <Tab.Screen
        name="Chat"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "people" : "people-outline"}
              size={24}
              color={color}
            />
          ),
          tabBarLabel: 'Friends',
        }}
      >
        {(props) => <FriendsScreen {...props} userId={userId} />}
      </Tab.Screen>

      <Tab.Screen
        name="Profile"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Feather
              name="user"
              size={24}
              color={color}
            />
          ),
          tabBarLabel: 'Profile',
        }}
      >
        {(props) => <ProfileScreen {...props} userId={userId} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

const CreatePostPlaceholder = () => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderTitle}>Create Post</Text>
    <Text style={styles.placeholderText}>Coming Soon!</Text>
    <Text style={styles.placeholderSubtext}>
      Share your food experiences with friends
    </Text>
  </View>
);



export const AppNavigator: React.FC<AppNavigatorProps> = ({
  isAuthenticated,
  userId,
  onLogin,
  onSignUp,
}) => {
  const [globalFilters, setGlobalFilters] = useState<FilterOptions>({
    cuisines: [],
    priceRange: ['$', '$$', '$$$', '$$$$'],
    radius: 10000, // Increased to 10km for better initial results
    dietaryRestrictions: [],
    allergies: [],
    openNow: false,
  });

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login">
              {(props) => <LoginScreen {...props} onLogin={onLogin} />}
            </Stack.Screen>
            <Stack.Screen name="SignUp">
              {(props) => <SignUpScreen {...props} onSignUp={onSignUp} />}
            </Stack.Screen>
          </>
        ) : (
          <>
            <Stack.Screen name="Main">
              {() => <MainTabs userId={userId!} filters={globalFilters} onFiltersChange={setGlobalFilters} />}
            </Stack.Screen>
            <Stack.Screen
              name="Filters"
              options={{
                headerShown: true,
                presentation: 'modal',
                headerTitle: 'Filters',
                headerStyle: {
                  backgroundColor: Colors.surface,
                },
                headerTintColor: Colors.textLight,
                headerTitleStyle: {
                  fontFamily: 'PlayfairDisplay_700Bold',
                  fontSize: 20,
                },
              }}
            >
              {({ navigation }) => (
                <FilterScreen
                  navigation={navigation}
                  currentFilters={globalFilters}
                  onApplyFilters={setGlobalFilters}
                />
              )}
            </Stack.Screen>
            <Stack.Screen
              name="CreatePost"
              component={CreatePostPlaceholder}
              options={{
                headerShown: true,
                presentation: 'modal',
                headerTitle: 'Create Post',
                headerStyle: {
                  backgroundColor: Colors.surface,
                },
                headerTintColor: Colors.textLight,
                headerTitleStyle: {
                  fontFamily: 'PlayfairDisplay_700Bold',
                  fontSize: 20,
                },
              }}
            />
            <Stack.Screen
              name="RestaurantDetails"
              component={RestaurantDetailsScreen}
              options={{
                headerShown: true,
                presentation: 'card',
                headerTitle: 'Restaurant Details',
                headerStyle: {
                  backgroundColor: Colors.surface,
                },
                headerTintColor: Colors.textLight,
                headerTitleStyle: {
                  fontFamily: 'PlayfairDisplay_700Bold',
                  fontSize: 18,
                },
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 20,
  },
  placeholderTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 32,
    color: Colors.gold,
    marginBottom: 10,
  },
  placeholderText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 24,
    color: Colors.textLight,
    marginBottom: 10,
  },
  placeholderSubtext: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
