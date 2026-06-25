/**
 * Vistara Group App
 * Main Application Entry Point
 */

import React, { useState, useEffect } from 'react';
import { TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import store from './src/redux/store';
import SplashScreen from './src/screens/Splashscreen/Splashscreen';
import AppNavigator from './src/navigation/Appnavigator';
import { navigateFromNotif } from './src/navigation/notifRouting';

// Standalone (EAS) builds follow the device theme; in dark mode RN defaults
// TextInput placeholders to white. The app is light-only, so force a visible
// grey placeholder everywhere unless a component sets its own.
if (TextInput.defaultProps == null) TextInput.defaultProps = {};
if (TextInput.defaultProps.placeholderTextColor == null) {
  TextInput.defaultProps.placeholderTextColor = '#9CA3AF';
}

const ONESIGNAL_APP_ID = '6904b4e0-0e22-4685-a609-a38038a4082a';

// react-native-onesignal is a native module; it isn't present in Expo Go.
// Load it lazily so the app still runs in Expo Go — push notifications only
// activate in a real dev/production build where the native module is linked.
let OneSignal = null;
try {
  OneSignal = require('react-native-onesignal').OneSignal;
} catch (e) {
  OneSignal = null;
}

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (!OneSignal) return; // Expo Go / native module unavailable
    try {
      OneSignal.initialize(ONESIGNAL_APP_ID);
      OneSignal.Notifications.requestPermission(true);
      // Tapping a push deep-links to the relevant screen (leads/approvals/…).
      OneSignal.Notifications.addEventListener('click', (event) => {
        try { navigateFromNotif(event?.notification?.additionalData); } catch (e) {}
      });
    } catch (e) {
      console.warn('OneSignal init skipped:', e?.message);
    }
  }, []);

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  if (showSplash) {
    return (
      <Provider store={store}>
        <SafeAreaProvider>
          <SplashScreen onFinish={handleSplashFinish} />
        </SafeAreaProvider>
      </Provider>
    );
  }

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <AppNavigator />
      </SafeAreaProvider>
    </Provider>
  );
}

export default App;