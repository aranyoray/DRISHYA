# DRISHYA Mobile App

Vision Assist AI mobile application built with React Native and Expo.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Run on specific platform:
```bash
npm run ios      # Run on iOS simulator
npm run android  # Run on Android emulator
npm run web      # Run in web browser
```

## Project Structure

- `index.js` - Entry point that registers the root component
- `App.js` - Main application component
- `app.json` - Expo configuration
- `babel.config.js` - Babel configuration for React Native
- `assets/` - Images and other static assets

## Key Fix

This project uses a proper entry point configuration with `index.js` that imports and registers the App component using `registerRootComponent` from Expo. This resolves the common "Unable to resolve module expo/AppEntry" error by:

1. Setting `"main": "index.js"` in package.json
2. Creating index.js that properly registers the root component
3. Using `registerRootComponent` instead of relying on expo/AppEntry

## Requirements

- Node.js 18+
- npm or yarn
- Expo CLI (will be installed with dependencies)
