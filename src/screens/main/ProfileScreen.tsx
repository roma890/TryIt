import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { authService } from '../../services/firebase/auth.service';
import { firestoreService } from '../../services/firebase/firestore.service';
import { Colors } from '../../constants/colors';

interface ProfileScreenProps {
  navigation: any;
  userId: string;
}

interface UserStats {
  totalSwipes: number;
  totalLikes: number;
  totalDislikes: number;
  favoriteRestaurants: number;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  navigation,
  userId,
}) => {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [stats, setStats] = useState<UserStats>({
    totalSwipes: 0,
    totalLikes: 0,
    totalDislikes: 0,
    favoriteRestaurants: 0,
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        setUserName(currentUser.displayName || 'User');
        setUserEmail(currentUser.email || '');
      }

      // Load user statistics
      const swipes = await firestoreService.getUserSwipes(userId);
      const likes = swipes.filter((s) => s.direction === 'right').length;
      const dislikes = swipes.filter((s) => s.direction === 'left').length;
      const favorites = await firestoreService.getLikedRestaurants(userId);

      setStats({
        totalSwipes: swipes.length,
        totalLikes: likes,
        totalDislikes: dislikes,
        favoriteRestaurants: favorites.length,
      });
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await authService.signOut();
          } catch (error) {
            console.error('Error signing out:', error);
            Alert.alert('Error', 'Failed to sign out. Please try again.');
          }
        },
      },
    ]);
  };

  const handleClearHistory = async () => {
    Alert.alert(
      'Clear History',
      'This will remove all your swipes and matches. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const swipes = await firestoreService.getUserSwipes(userId);
              for (const swipe of swipes) {
                await firestoreService.removeSwipe(userId, swipe.restaurantId);
              }
              await loadUserProfile();
              Alert.alert('Success', 'Your history has been cleared.');
            } catch (error) {
              console.error('Error clearing history:', error);
              Alert.alert('Error', 'Failed to clear history. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.gold} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={48} color={Colors.gold} />
          </View>
          <TouchableOpacity style={styles.editAvatarButton}>
            <Ionicons name="camera" size={18} color={Colors.background} />
          </TouchableOpacity>
        </View>

        <Text style={styles.userName}>{userName}</Text>
        <Text style={styles.userEmail}>{userEmail}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsSection}>
        <View style={styles.statCard}>
          <Ionicons name="flame" size={28} color={Colors.gold} />
          <Text style={styles.statNumber}>{stats.totalSwipes}</Text>
          <Text style={styles.statLabel}>Total Swipes</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="heart" size={28} color={Colors.error} />
          <Text style={styles.statNumber}>{stats.totalLikes}</Text>
          <Text style={styles.statLabel}>Liked</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="star" size={28} color={Colors.gold} />
          <Text style={styles.statNumber}>{stats.favoriteRestaurants}</Text>
          <Text style={styles.statLabel}>Favorites</Text>
        </View>
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>

        <View style={styles.settingsList}>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications" size={22} color={Colors.gold} />
              <Text style={styles.settingText}>Push Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: Colors.border, true: Colors.gold }}
              thumbColor={Colors.textLight}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="moon" size={22} color={Colors.gold} />
              <Text style={styles.settingText}>Dark Mode</Text>
            </View>
            <Switch
              value={darkModeEnabled}
              onValueChange={setDarkModeEnabled}
              trackColor={{ false: Colors.border, true: Colors.gold }}
              thumbColor={Colors.textLight}
            />
          </View>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <MaterialCommunityIcons
                name="account-edit"
                size={22}
                color={Colors.gold}
              />
              <Text style={styles.settingText}>Edit Profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="lock-closed" size={22} color={Colors.gold} />
              <Text style={styles.settingText}>Privacy & Security</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>

        <View style={styles.settingsList}>
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('Filters')}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="options" size={22} color={Colors.gold} />
              <Text style={styles.settingText}>Food Filters</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="location" size={22} color={Colors.gold} />
              <Text style={styles.settingText}>Location Settings</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <MaterialCommunityIcons
                name="food-variant"
                size={22}
                color={Colors.gold}
              />
              <Text style={styles.settingText}>Dietary Restrictions</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>

        <View style={styles.settingsList}>
          <TouchableOpacity style={styles.settingItem} onPress={handleClearHistory}>
            <View style={styles.settingLeft}>
              <Ionicons name="trash" size={22} color={Colors.warning} />
              <Text style={[styles.settingText, { color: Colors.warning }]}>
                Clear History
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="help-circle" size={22} color={Colors.gold} />
              <Text style={styles.settingText}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="information-circle" size={22} color={Colors.gold} />
              <Text style={styles.settingText}>About</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sign Out Button */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Ionicons name="log-out" size={20} color={Colors.textLight} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

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
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.gold,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.gold,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.surface,
  },
  userName: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 28,
    color: Colors.textLight,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  userEmail: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: Colors.textSecondary,
  },
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 12,
    backgroundColor: Colors.background,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 28,
    color: Colors.textLight,
    marginTop: 12,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: Colors.surface,
  },
  sectionTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 22,
    color: Colors.textLight,
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  settingsList: {
    gap: 4,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  settingText: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 16,
    color: Colors.textLight,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error,
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  signOutText: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 18,
    color: Colors.textLight,
    letterSpacing: 0.5,
  },
  bottomSpacer: {
    height: 100,
  },
});
