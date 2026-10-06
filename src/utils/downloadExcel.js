import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getBaseUrl } from '../constants/api';

// Download an Excel file the server builds (Leads, Site Visits …) with the person's
// sign-in, then hand it to the share sheet (WhatsApp, email, Files…). A big list is
// built in the background on the server: the first call answers with a job, which
// is polled until the file is ready, reporting onProgress(done, total). Returns ''
// when it worked, or what went wrong — the server's own words when it refused
// (mirrors the web's lib/downloadExcel).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function readJson(uri) {
  try { return JSON.parse(await FileSystem.readAsStringAsync(uri)); } catch (_) { return {}; }
}

export async function downloadExcel(url, name, title = 'Excel', onProgress) {
  try {
    const token = await AsyncStorage.getItem('access_token');
    const headers = { Authorization: `Bearer ${token}` };
    const target = FileSystem.cacheDirectory + name.replace(/[^A-Za-z0-9.-]+/g, '-');
    let { uri, status } = await FileSystem.downloadAsync(url, target, { headers });
    if (status === 202) {
      const { job, total } = await readJson(uri);
      onProgress?.(0, total);
      const statusUrl = `${getBaseUrl()}/api/sales/exports/${job}/`;
      let ready = false;
      for (let i = 0; i < 600 && !ready; i += 1) {      // up to ~20 minutes
        await sleep(2000);
        const res = await fetch(statusUrl, { headers });
        const st = await res.json().catch(() => ({}));
        if (!res.ok) return st.detail || 'Could not download the file.';
        onProgress?.(st.done || 0, st.total || total);
        if (st.status === 'error') return st.detail || 'Could not build the file.';
        ready = st.status === 'done';
      }
      if (!ready) return 'The file is taking too long to build. Narrow the filters and try again.';
      ({ uri, status } = await FileSystem.downloadAsync(`${statusUrl}file/`, target, { headers }));
    }
    if (status !== 200) {
      const body = await readJson(uri);
      return body?.detail || (status === 403 ? 'You do not have access to download this.' : `Could not build the sheet (HTTP ${status}). Try again.`);
    }
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: title, UTI: 'org.openxmlformats.spreadsheetml.sheet' });
    }
    return '';
  } catch (e) {
    return e?.message || 'Could not download the file.';
  }
}

// Who gets Download Excel on Leads and Site Visits: granted per person in User
// Management (Download leads & site visits Excel), and admins.
export const canExportLeads = (user) => !!(user && (user.can_export_leads || user.role === 'Admin' || user.is_staff));
