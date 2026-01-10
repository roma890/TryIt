import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { initializeFirebase, auth } from './src/services/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_900Black,
} from '@expo-google-fonts/playfair-display';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import { Colors } from './src/constants/colors';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  // Load custom fonts
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_900Black,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
  });

  useEffect(() => {
    // Initialize Firebase
    initializeFirebase();

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
        setUserId(user.uid);
      } else {
        setIsAuthenticated(false);
        setUserId(undefined);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = (uid: string) => {
    setUserId(uid);
    setIsAuthenticated(true);
  };

  const handleSignUp = (uid: string) => {
    setUserId(uid);
    setIsAuthenticated(true);
  };

  if (!fontsLoaded || loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.gold} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <AppNavigator
        isAuthenticated={isAuthenticated}
        userId={userId}
        onLogin={handleLogin}
        onSignUp={handleSignUp}
      />
    </>
  );
}
