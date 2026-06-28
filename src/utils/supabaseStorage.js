import * as FileSystem from 'expo-file-system/legacy';
import { FileSystemUploadType } from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SALES_ENDPOINTS } from '../constants/api';

// Uploads now go through the backend (service-role key) instead of the public anon
// key, so the Supabase anon INSERT policy can be revoked. Returns the public URL.
export async function uploadToSupabase(fileUri, mimeType = 'image/jpeg', folder = 'erp/media') {
  const token = await AsyncStorage.getItem('access_token');
  const headers = { Authorization: `Bearer ${token}` };
  const ext = fileUri.split('.').pop().split('?')[0].toLowerCase() || 'jpg';
  const filename = `upload_${Date.now()}.${ext}`;

  const isRemote = /^(https?:|blob:|data:)/i.test(fileUri);
  if (isRemote) {
    // Remote/blob source → multipart via fetch (RN reads the uri).
    const fd = new FormData();
    fd.append('file', { uri: fileUri, name: filename, type: mimeType });
    fd.append('folder', folder);
    const res = await fetch(SALES_ENDPOINTS.mediaUpload, { method: 'POST', headers, body: fd });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Upload failed (${res.status})`);
    }
    return (await res.json()).url;
  }

  // Local file → native multipart upload to the backend.
  const result = await FileSystem.uploadAsync(SALES_ENDPOINTS.mediaUpload, fileUri, {
    httpMethod: 'POST',
    headers,
    fieldName: 'file',
    mimeType,
    uploadType: FileSystemUploadType.MULTIPART,
    parameters: { folder },
  });
  if (result.status < 200 || result.status >= 300) {
    let message = `Upload failed (${result.status})`;
    try { const b = JSON.parse(result.body || '{}'); if (b.detail) message = b.detail; } catch {}
    throw new Error(message);
  }
  return JSON.parse(result.body).url;
}
