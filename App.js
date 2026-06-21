/**
 * Vistara Group App
 * Main Application Entry Point
 */

import React, { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { OneSignal } from 'react-native-onesignal';
import store from './src/redux/store';
import SplashScreen from './src/screens/Splashscreen/Splashscreen';
import AppNavigator from './src/navigation/Appnavigator';

const ONESIGNAL_APP_ID = '6904b4e0-0e22-4685-a609-a38038a4082a';

function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    OneSignal.initialize(ONESIGNAL_APP_ID);
    OneSignal.Notifications.requestPermission(true);
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