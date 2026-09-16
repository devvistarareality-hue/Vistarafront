import React, { useEffect, useState } from 'react';
import { View, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Theme has to be known before any screen module is evaluated, because styles
// are built once at import time. So the real app is required only after the
// saved preference is read and published on `global.__NX_THEME__`.
export default function Root() {
  const [App, setApp] = useState(null);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem('nx-theme')
      .catch(() => null)
      .then((t) => {
        global.__NX_THEME__ = t === 'dark' || t === 'light' ? t : (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light');
        const Loaded = require('./App').default;
        if (alive) setApp(() => Loaded);
      });
    return () => { alive = false; };
  }, []);
  if (!App) {
    const dark = Appearance.getColorScheme() === 'dark';
    return <View style={{ flex: 1, backgroundColor: dark ? '#07080A' : '#E9F1FA' }} />;
  }
  return <App />;
}
