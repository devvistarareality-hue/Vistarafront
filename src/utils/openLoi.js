import { Linking, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { apiFetch } from './apiFetch';
import { SALES_ENDPOINTS } from '../constants/api';

// Pick the signed LOI (PDF or photo) and save it on the booking again — for one that
// is missing from storage. Resolves true once it is stored.
export async function reuploadLoi(bookingId) {
  try {
    const res = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
    const a = res?.assets?.[0];
    if (res?.canceled || !a) return false;
    const data = await FileSystem.readAsStringAsync(a.uri, { encoding: FileSystem.EncodingType.Base64 });
    const r = await apiFetch(SALES_ENDPOINTS.bookingLoiUrl(bookingId), {
      method: 'POST', body: JSON.stringify({ loi_file: { name: a.name || 'signed-loi.pdf', type: a.mimeType || 'application/pdf', data } }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { Alert.alert('Not uploaded', d?.detail || 'Could not upload the signed LOI.'); return false; }
    Alert.alert('Uploaded', 'The signed LOI is saved on this booking.');
    return true;
  } catch (e) {
    Alert.alert('Not uploaded', 'Could not upload the signed LOI.');
    return false;
  }
}

// Open the confidential LOI via a short-lived signed URL (never a public link). One
// missing from storage can be uploaded again from here.
export async function openLoi(bookingId) {
  try {
    const r = await apiFetch(SALES_ENDPOINTS.bookingLoiUrl(bookingId));
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.url) { Linking.openURL(d.url); return; }
    if (d?.code === 'loi_missing') {
      Alert.alert('Signed LOI missing', `${d.detail} Do you have the signed copy?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Upload signed LOI', onPress: async () => { if (await reuploadLoi(bookingId)) openLoi(bookingId); } },
      ]);
      return;
    }
    Alert.alert('Unavailable', d?.detail || 'Could not open the LOI right now.');
  } catch (e) {
    Alert.alert('Error', 'Could not open the LOI.');
  }
}
