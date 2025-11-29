# DRISHYA Setup Guide

Complete setup instructions for developers and users.

## For Developers

### 1. Environment Setup

**Install Node.js and npm:**
```bash
# macOS (using Homebrew)
brew install node

# Or download from: https://nodejs.org/
```

**Install Expo CLI:**
```bash
npm install -g expo-cli
```

### 2. Project Setup

**Clone and install:**
```bash
cd mobile-app
npm install
```

**Configure Environment:**
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your OpenAI API key
# Get key from: https://platform.openai.com/api-keys
```

**Or manually configure in code:**
Edit `src/constants/config.js`:
```javascript
export const API_CONFIG = {
  OPENAI_API_KEY: 'your-actual-api-key-here',
  // ...
};
```

### 3. Running the App

**Start development server:**
```bash
npm start
```

**Run on iOS (macOS only):**
```bash
npm run ios
```

**Run on Android:**
```bash
npm run android
```

**Run on physical device:**
1. Install Expo Go app
2. Scan QR code from terminal
3. Grant camera/location permissions

## For iOS Development

### Prerequisites

- macOS with Xcode installed
- iOS Simulator or physical iPhone
- Apple Developer account (for physical device)

### Setup Steps

```bash
# Install CocoaPods (if not already installed)
sudo gem install cocoapods

# Install iOS dependencies
cd ios
pod install
cd ..

# Run on simulator
npm run ios
```

### LIDAR Support

LIDAR features require:
- iPhone 12 Pro or later
- iPad Pro 2020 or later

## For Android Development

### Prerequisites

- Android Studio with Android SDK
- Android Emulator or physical Android device
- USB debugging enabled (for physical device)

### Setup Steps

```bash
# Ensure Android SDK is configured
# Set ANDROID_HOME environment variable

# Run on emulator or connected device
npm run android
```

## API Configuration

### OpenAI API Key

1. **Create OpenAI Account**: https://platform.openai.com
2. **Generate API Key**: Navigate to API Keys section
3. **Add Billing**: Vision API requires paid plan
4. **Set Usage Limits**: Recommended to prevent unexpected charges

### Cost Estimation

GPT-4 Vision pricing (as of 2024):
- ~$0.01 per image analysis
- With 2-second intervals: ~$18/hour of continuous use
- Recommended: Use longer intervals or manual capture mode

### Alternative: Free Testing

For testing without API costs:
- Use manual capture mode (not continuous)
- Set longer intervals (5-10 seconds)
- Use mock responses for development

## Permissions Required

### iOS Permissions

Configured in `app.json`:
- Camera access (NSCameraUsageDescription)
- Location access (NSLocationWhenInUseUsageDescription)
- Microphone (optional, for future voice commands)

### Android Permissions

Configured in `app.json`:
- CAMERA
- ACCESS_FINE_LOCATION
- ACCESS_COARSE_LOCATION
- VIBRATE
- RECORD_AUDIO (optional)

## Testing

### Unit Testing (Optional)

```bash
# Install testing dependencies
npm install --save-dev jest @testing-library/react-native

# Run tests
npm test
```

### Manual Testing Checklist

- [ ] Camera opens correctly
- [ ] Permissions granted properly
- [ ] Audio descriptions play
- [ ] Haptic feedback works
- [ ] Mode switching functional
- [ ] Settings persist
- [ ] VoiceOver/TalkBack compatible
- [ ] Performance acceptable on target devices

## Troubleshooting

### "Unable to resolve module expo/AppEntry"

✅ **Already fixed in this project!**

The entry point is properly configured:
- `package.json` has `"main": "index.js"`
- `index.js` uses `registerRootComponent`

### Camera Permission Denied

1. Check Settings > DRISHYA > Permissions
2. Enable Camera access
3. Restart the app

### API Errors

1. Verify API key is correct
2. Check OpenAI account has credits
3. Ensure internet connection
4. Check API endpoint URL

### Build Errors

```bash
# Clear cache and reinstall
rm -rf node_modules
npm install

# Clear Expo cache
expo start -c
```

### iOS CocoaPods Issues

```bash
cd ios
pod deintegrate
pod install
cd ..
```

## Production Build

### iOS App Store

```bash
# Create production build
expo build:ios

# Or with EAS Build
eas build --platform ios
```

### Android Play Store

```bash
# Create production build
expo build:android

# Or with EAS Build
eas build --platform android
```

## Hardware Recommendations

### For Best Experience

**iOS:**
- iPhone 12 Pro or later (LIDAR support)
- iOS 15+
- 128GB+ storage

**Android:**
- Flagship device with good camera
- Android 12+
- 6GB+ RAM

### Smart Glasses Integration (Future)

Potential hardware partners:
- Ray-Ban Meta Smart Glasses
- Vuzix Smart Glasses
- Google Glass Enterprise
- Custom ESP32-CAM based glasses

## Support & Resources

- **Expo Docs**: https://docs.expo.dev
- **React Navigation**: https://reactnavigation.org
- **OpenAI Vision API**: https://platform.openai.com/docs/guides/vision
- **Accessibility**: https://reactnative.dev/docs/accessibility

## Next Steps

1. Set up your API key
2. Install dependencies
3. Run on device
4. Test camera functionality
5. Configure audio settings
6. Test with VoiceOver/TalkBack enabled

**Happy coding! 🚀**
