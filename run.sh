#!/bin/bash

# FoodSwipe App Launcher
# Choose where to run your app

echo ""
echo "╔════════════════════════════════════════╗"
echo "║       FoodSwipe App Launcher           ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "Choose how to run your app:"
echo ""
echo "  1) iOS Simulator (local, fast)"
echo "  2) Expo Go on Phone (WiFi/LAN)"
echo "  3) Expo Go on Phone (Tunnel - for cellular/unstable WiFi)"
echo "  4) Web Browser"
echo "  5) Exit"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
  1)
    echo ""
    echo "🚀 Starting on iOS Simulator..."
    echo ""
    npm run ios
    ;;
  2)
    echo ""
    echo "🚀 Starting Expo in LAN mode..."
    echo ""
    echo "📱 Instructions:"
    echo "   1. Make sure your phone and Mac are on the SAME WiFi"
    echo "   2. Open Expo Go app on your phone"
    echo "   3. Scan the QR code that appears below"
    echo ""
    npx expo start --lan
    ;;
  3)
    echo ""
    echo "🚀 Starting Expo in Tunnel mode..."
    echo ""
    echo "📱 Instructions:"
    echo "   1. Open Expo Go app on your phone"
    echo "   2. Scan the QR code that appears below"
    echo "   3. Works with cellular data or any network!"
    echo ""
    npx expo start --tunnel
    ;;
  4)
    echo ""
    echo "🚀 Starting on Web Browser..."
    echo ""
    npm run web
    ;;
  5)
    echo ""
    echo "👋 Goodbye!"
    exit 0
    ;;
  *)
    echo ""
    echo "❌ Invalid choice. Please run the script again."
    exit 1
    ;;
esac
