/**
 * Vistara Group App
 * Main Application Entry Point
 */

import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import store from './src/redux/store';
import SplashScreen from './src/screens/Splashscreen/Splashscreen';
import AppNavigator from './src/navigation/Appnavigator';

function App() {
  const [showSplash, setShowSplash] = useState(true);

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