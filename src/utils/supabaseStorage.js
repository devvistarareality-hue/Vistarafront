import * as FileSystem from 'expo-file-system/legacy';
import { FileSystemUploadType } from 'expo-file-system/legacy';

const SUPABASE_URL  = 'https://lftvumbhogcixihjydwx.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxmdHZ1bWJob2djaXhpaGp5ZHd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE2OTE1MDMsImV4cCI6MjA5NzI2NzUwM30.BXi352GOwxIJDEafjZD-fLFE-SwcmmAFZCCiPX9sNTg';
const BUCKET = 'erp-media';

export async function uploadToSupabase(fileUri, mimeType = 'image/jpeg', folder = 'erp/media') {
  const ext  = fileUri.split('.').pop().split('?')[0].toLowerCase() || 'jpg';
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const path = `${folder}/${filename}`;

  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;

  const isRemote = /^(https?:|blob:|data:)/i.test(fileUri);
  if (isRemote) {
    const response = await fetch(fileUri);
    const blob     = await response.blob();

    const res = await fetch(uploadUrl, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${SUPABASE_ANON}`,
        apikey:         SUPABASE_ANON,
        'Content-Type': mimeType,
      },
      body: blob,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Upload failed (${res.status})`);
    }

    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
  }

  // For Expo mobile / local files, use native uploadAsync.
  const uploadOptions = {
    httpMethod: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON}`,
      apikey: SUPABASE_ANON,
    },
    fieldName: 'file',
    mimeType,
    uploadType: FileSystemUploadType.MULTIPART,
  };

  const result = await FileSystem.uploadAsync(uploadUrl, fileUri, uploadOptions);
  if (result.status < 200 || result.status >= 300) {
    let message = `Upload failed (${result.status})`;
    try {
      const body = JSON.parse(result.body || '{}');
      if (body.message) message = body.message;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}
