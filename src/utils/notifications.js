import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiFetch } from './apiFetch';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications() {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;

  if (existing !== 'granted') {
    const { status: asked } = await Notifications.requestPermissionsAsync();
    status = asked;
  }

  if (status !== 'granted') {
    console.warn('Push notification permission not granted');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#182350',
    });
  }

  // Use native FCM device token (works directly with Firebase Admin SDK)
  const { data: token } = await Notifications.getDevicePushTokenAsync();
  console.log('FCM device token:', token);
  return token;
}

export async function savePushToken(token) {
  if (!token) return;
  try {
    const res = await apiFetch('/api/auth/notifications/token/', {
      method: 'POST',
      body: JSON.stringify({ token, platform: Platform.OS }),
    });
    console.log('Push token saved, status:', res?.status);
  } catch (e) {
    console.error('Failed to save push token:', e);
  }
}
