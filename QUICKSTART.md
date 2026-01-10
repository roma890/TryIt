# Quick Start Guide

Get the FoodSwipe app running in 10 minutes!

## Prerequisites
- Node.js installed
- Firebase account
- Google Cloud account

## Quick Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Firebase Setup (5 minutes)
1. Go to [firebase.google.com](https://console.firebase.google.com/)
2. Create new project
3. Enable Authentication (Email/Password)
4. Create Firestore Database (test mode)
5. Enable Storage
6. Copy config from Project Settings
7. Paste into `src/services/firebase/config.ts`

### 3. Google Places API (3 minutes)
1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Create new project
3. Enable billing (required, but $200 free/month)
4. Enable Places API
5. Create API key
6. Paste into `src/services/api/googlePlaces.service.ts`

### 4. Run the App
```bash
npm start
```

Then:
- Scan QR code with Expo Go app, OR
- Press `i` for iOS simulator, OR
- Press `a` for Android emulator

## Test the App

1. **Sign Up**: Create account with email/password
2. **Swipe**: Swipe right to like restaurants
3. **Filter**: Tap settings icon to filter by cuisine, price, etc.
4. **Feed**: Share food photos (tap + button)

## File Structure Reference

```
Key files to configure:
├── src/services/firebase/config.ts          ← Add Firebase config
├── src/services/api/googlePlaces.service.ts ← Add Google API key
└── App.tsx                                  ← Main app entry point

Main screens:
├── src/screens/auth/LoginScreen.tsx         ← Login page
├── src/screens/auth/SignUpScreen.tsx        ← Sign up page
├── src/screens/main/SwipeScreen.tsx         ← Swipe interface
├── src/screens/social/SocialFeedScreen.tsx  ← Social feed
└── src/screens/settings/FilterScreen.tsx    ← Filters
```

## Troubleshooting

**App won't start?**
- Run `npm install` again
- Clear cache: `expo start -c`

**No restaurants showing?**
- Check Google Places API key
- Ensure billing enabled in Google Cloud
- Check console for errors

**Firebase errors?**
- Verify Firebase config is correct
- Check that Auth and Firestore are enabled

**Need help?** See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed instructions.

---

That's it! You should now have a working FoodSwipe app. 🍽️

Next steps:
- Customize the UI
- Add more features from the roadmap
- Invite friends to test
- Deploy to app stores
