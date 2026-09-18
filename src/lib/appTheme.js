import AsyncStorage from '@react-native-async-storage/async-storage';
import { reloadAppAsync } from 'expo';
import { THEME_MODE } from '../constants/theme';

export const currentTheme = () => THEME_MODE;

// Styles are built at startup, so a theme change saves the choice and reloads.
export async function setAppTheme(mode) {
  if (mode === THEME_MODE) return;
  await AsyncStorage.setItem('nx-theme', mode);
  try {
    await reloadAppAsync('theme change');
  } catch (e) {
    const { DevSettings } = require('react-native');
    DevSettings.reload?.();
  }
}
