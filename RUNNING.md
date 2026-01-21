# Running FoodSwipe App

Multiple ways to run and test your FoodSwipe app!

## 🚀 Quick Start (Interactive Menu)

Run the interactive launcher:

```bash
npm run dev
```

This will show you a menu to choose where to run the app.

---

## 📱 Running Options

### Option 1: iOS Simulator (Fastest for Development)

**Requirements**: Xcode installed

```bash
npm run simulator
```

or

```bash
npm run ios
```

**Pros:**
- Runs locally on your Mac
- Super fast hot reload
- No network issues
- Best for active development

**Cons:**
- Requires Xcode (~15GB)
- Only works on Mac

---

### Option 2: Expo Go on Phone (Same WiFi)

**Requirements**:
- Expo Go app installed on your phone
- Phone and Mac on the **same WiFi network**

```bash
npm run phone
```

**Pros:**
- Test on real device
- Fast connection
- Better performance than tunnel

**Cons:**
- Requires same WiFi network
- Won't work on cellular data
- May not work on public/coffee shop WiFi that blocks device-to-device communication

**How to use:**
1. Connect your phone and Mac to the same WiFi
2. Run `npm run phone`
3. Open Expo Go app on your phone
4. Scan the QR code or enter the URL shown

---

### Option 3: Expo Go on Phone (Tunnel - Works Anywhere)

**Requirements**: Expo Go app installed on your phone

```bash
npm run phone:tunnel
```

**Pros:**
- Works on cellular data
- Works on different networks
- Works on restricted WiFi (coffee shops, hotels, etc.)
- No network configuration needed

**Cons:**
- Slower than LAN mode
- Requires internet connection
- Initial load takes 1-2 minutes

**How to use:**
1. Run `npm run phone:tunnel`
2. Wait for "Tunnel ready" message (~30 seconds)
3. Open Expo Go app on your phone
4. Scan the QR code shown
5. Wait for bundle to download (1-2 minutes first time)

---

### Option 4: Web Browser

```bash
npm run web
```

**Pros:**
- No installation needed
- Quick to test UI changes
- Works on any computer

**Cons:**
- Some mobile features won't work
- Not a real mobile experience
- Camera, location, etc. may not work

---

## 🎯 When to Use Each Option

| Scenario | Best Option |
|----------|-------------|
| Active development & coding | **iOS Simulator** |
| Testing on real device at home | **Phone (LAN)** |
| Testing at coffee shop/public WiFi | **Phone (Tunnel)** |
| Testing with cellular data | **Phone (Tunnel)** |
| Quick UI check | **Web Browser** |
| Showing to someone remotely | **Phone (Tunnel)** |

---

## 🔧 Troubleshooting

### Simulator won't start
- Make sure Xcode is installed
- Run `sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer`
- Run `sudo xcodebuild -license accept`

### Phone can't connect (LAN mode)
- Check both devices are on same WiFi
- Try tunnel mode instead: `npm run phone:tunnel`
- Check Mac firewall settings

### Tunnel is slow
- This is normal - tunnel routes through Expo's servers
- First load takes 1-2 minutes
- Subsequent reloads are faster

### "Port 8081 is in use"
- Stop any running Expo processes
- Kill the port: `lsof -ti:8081 | xargs kill -9`
- Run your command again

---

## 📝 Quick Reference

```bash
# Interactive menu (recommended)
npm run dev

# Direct commands
npm run simulator      # iOS Simulator
npm run phone         # Phone on same WiFi
npm run phone:tunnel  # Phone on any network
npm run web           # Web browser

# Advanced
npm run ios           # Same as simulator
npm run android       # Android emulator (needs Android Studio)
npm start             # Default Expo start (shows QR code)
```

---

## 💡 Tips

- **First time loading** on phone takes 1-3 minutes
- **Hot reload** after first load is 2-5 seconds
- **Shake phone** in Expo Go to access developer menu
- **Cmd+R** in simulator to reload
- Use **tunnel mode** when traveling or on cellular data
- Use **simulator** for fastest development workflow
