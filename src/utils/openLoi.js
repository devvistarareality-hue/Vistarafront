import { Linking, Alert } from 'react-native';
import { apiFetch } from './apiFetch';
import { SALES_ENDPOINTS } from '../constants/api';

// Open the confidential LOI via a short-lived signed URL (never a public link).
export async function openLoi(bookingId) {
  try {
    const r = await apiFetch(SALES_ENDPOINTS.bookingLoiUrl(bookingId));
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.url) Linking.openURL(d.url);
    else Alert.alert('Unavailable', d?.detail || 'Could not open the LOI right now.');
  } catch (e) {
    Alert.alert('Error', 'Could not open the LOI.');
  }
}
