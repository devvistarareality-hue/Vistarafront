import { createNavigationContainerRef } from '@react-navigation/native';

// Lets non-React code (OneSignal push-click handler) drive navigation.
export const navigationRef = createNavigationContainerRef();
