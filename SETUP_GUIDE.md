# FoodSwipe App - Detailed Setup Guide

This guide will walk you through setting up the FoodSwipe app from scratch.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Firebase Setup](#firebase-setup)
3. [Google Places API Setup](#google-places-api-setup)
4. [Local Development Setup](#local-development-setup)
5. [Testing the App](#testing-the-app)
6. [Deployment](#deployment)

---

## Prerequisites

### Required Software
- **Node.js**: Version 16 or higher ([Download](https://nodejs.org/))
- **npm** or **yarn**: Comes with Node.js
- **Git**: For version control
- **Expo CLI**: `npm install -g expo-cli`

### Mobile Development
- **For iOS**:
  - Mac computer with Xcode installed
  - iOS Simulator (comes with Xcode)
  - OR iPhone with Expo Go app installed

- **For Android**:
  - Android Studio with Android SDK
  - Android Emulator
  - OR Android phone with Expo Go app installed

### Accounts Needed
- Firebase account (free tier works)
- Google Cloud Platform account (free $300 credit for new users)

---

## Firebase Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: `foodswipe-app` (or your choice)
4. Disable Google Analytics (optional)
5. Click "Create project"

### Step 2: Enable Authentication

1. In your Firebase project, click "Authentication" in the left sidebar
2. Click "Get started"
3. Click on "Email/Password" sign-in method
4. Enable it and click "Save"

### Step 3: Create Firestore Database

1. Click "Firestore Database" in the left sidebar
2. Click "Create database"
3. Select "Start in test mode" (we'll add security rules later)
4. Choose your database location (select closest to your users)
5. Click "Enable"

### Step 4: Set Up Security Rules

1. Go to Firestore Database > Rules tab
2. Replace the rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read and write their own data
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    match /swipes/{swipeId} {
      allow read, write: if request.auth != null;
    }

    match /matches/{matchId} {
      allow read: if request.auth != null && request.auth.uid in resource.data.userIds;
      allow write: if request.auth != null;
    }

    match /posts/{postId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }

    match /chatRooms/{chatRoomId} {
      allow read: if request.auth != null && request.auth.uid in resource.data.participants;
      allow write: if request.auth != null;
    }

    match /messages/{messageId} {
      allow read, write: if request.auth != null;
    }

    match /friendRequests/{requestId} {
      allow read: if request.auth != null &&
        (request.auth.uid == resource.data.fromUserId ||
         request.auth.uid == resource.data.toUserId);
      allow write: if request.auth != null;
    }
  }
}
```

3. Click "Publish"

### Step 5: Enable Storage

1. Click "Storage" in the left sidebar
2. Click "Get started"
3. Use default security rules for now
4. Click "Next" and "Done"

### Step 6: Get Firebase Configuration

1. Go to Project Settings (gear icon) > General
2. Scroll down to "Your apps"
3. Click the web icon `</>`
4. Register your app with a nickname
5. Copy the `firebaseConfig` object
6. Open `src/services/firebase/config.ts` in your project
7. Replace the placeholder config with your values:

```typescript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "foodswipe-app.firebaseapp.com",
  projectId: "foodswipe-app",
  storageBucket: "foodswipe-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

---

## Google Places API Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" > "New Project"
3. Enter project name: `foodswipe-app`
4. Click "Create"

### Step 2: Enable Billing

⚠️ **Important**: Google Places API requires billing enabled, but you get $200 free credit per month

1. Go to Billing in the left menu
2. Link a billing account (requires credit card)
3. New users get $300 free credit for 90 days

### Step 3: Enable Required APIs

1. Go to "APIs & Services" > "Library"
2. Search and enable these APIs:
   - **Places API** (for restaurant data)
   - **Maps JavaScript API** (for maps display)
   - **Geocoding API** (for location services)

### Step 4: Create API Key

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy your API key
4. Click "Restrict Key" (recommended for security)

### Step 5: Restrict API Key (Recommended)

1. Under "Application restrictions":
   - For testing: Select "None"
   - For production: Select "iOS apps" or "Android apps" and add your bundle ID

2. Under "API restrictions":
   - Select "Restrict key"
   - Check: Places API, Maps JavaScript API, Geocoding API

3. Click "Save"

### Step 6: Add API Key to Project

1. Open `src/services/api/googlePlaces.service.ts`
2. Replace the placeholder:

```typescript
const GOOGLE_PLACES_API_KEY = 'AIza...your-key-here';
```

---

## Local Development Setup

### Step 1: Install Dependencies

```bash
cd FoodSwipeApp
npm install
```

### Step 2: Verify Configuration Files

Make sure you've updated:
- `src/services/firebase/config.ts` - Firebase credentials
- `src/services/api/googlePlaces.service.ts` - Google Places API key

### Step 3: Start Development Server

```bash
npm start
```

This will start the Expo development server and show a QR code.

### Step 4: Run on Device/Simulator

**Option A: Physical Device**
1. Install "Expo Go" app from App Store (iOS) or Play Store (Android)
2. Scan the QR code from the terminal
3. App will load on your device

**Option B: iOS Simulator (Mac only)**
```bash
npm run ios
```

**Option C: Android Emulator**
```bash
npm run android
```

---

## Testing the App

### Create Test Account

1. Launch the app
2. Tap "Sign Up"
3. Enter test credentials:
   - Display Name: Test User
   - Email: test@example.com
   - Password: test123
4. Tap "Sign Up"

### Test Swiping Feature

1. You should see the Discover screen
2. Swipe right to like a restaurant
3. Swipe left to pass
4. Tap the filter icon to adjust preferences

### Test Social Feed

1. Tap the Feed tab
2. Tap the + button to create a post
3. Select a restaurant and add a photo

### Debugging

View logs in the terminal where you ran `npm start`. Use `console.log()` for debugging.

---

## Deployment

### iOS Deployment (Apple App Store)

1. Join Apple Developer Program ($99/year)
2. Configure app.json with bundle identifier
3. Build: `eas build --platform ios`
4. Submit: `eas submit --platform ios`

### Android Deployment (Google Play Store)

1. Create Google Play Developer account ($25 one-time)
2. Configure app.json with package name
3. Build: `eas build --platform android`
4. Submit: `eas submit --platform android`

### Using Expo EAS (Recommended)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build for production
eas build --platform all
```

---

## Common Issues & Solutions

### Issue: "Firebase not initialized"
**Solution**: Check that `firebaseConfig` in `config.ts` is correctly filled out

### Issue: "Google Places API error"
**Solution**:
- Verify billing is enabled in Google Cloud
- Check that Places API is enabled
- Ensure API key is correct and not restricted incorrectly

### Issue: App crashes on startup
**Solution**:
- Run `npm install` again
- Clear Expo cache: `expo start -c`
- Check error messages in terminal

### Issue: "No restaurants found"
**Solution**:
- Location permissions might be denied
- Check that you're using a valid location
- Ensure Google Places API key is working

### Issue: Images not loading
**Solution**:
- Check Firebase Storage rules
- Verify image URLs are accessible
- Check internet connection

---

## Performance Optimization Tips

1. **Limit API Calls**: Cache restaurant data locally
2. **Image Optimization**: Compress images before upload
3. **Lazy Loading**: Load posts as user scrolls
4. **Debounce Search**: Wait for user to finish typing
5. **Index Firestore Queries**: Add indexes for complex queries

---

## Cost Estimates

### Free Tier (Testing)
- Firebase: Free for ~50 daily users
- Google Places API: $200/month free credit
- Expo: Free for development

### Production (1000 active users)
- Firebase: ~$25-50/month
- Google Places API: ~$50-100/month (depending on usage)
- Expo EAS: Free for basic features
- Total: ~$75-150/month

---

## Next Steps

1. ✅ Complete setup following this guide
2. Test all features locally
3. Invite beta testers
4. Collect feedback
5. Add remaining features (chat, friend search)
6. Optimize performance
7. Deploy to app stores

---

## Support

If you encounter issues:
1. Check the troubleshooting section
2. Review Firebase and Expo documentation
3. Check the issue tracker in the repository

Happy coding! 🍽️
