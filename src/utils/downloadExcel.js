import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// Download an Excel file the server builds (Leads, Site Visits …) with the person's
// sign-in, then hand it to the share sheet (WhatsApp, email, Files…). Returns '' when
// it worked, or what went wrong — the server's own words when it refused (mirrors the
// web's lib/downloadExcel).
export async function downloadExcel(url, name, title = 'Excel') {
  try {
    const token = await AsyncStorage.getItem('access_token');
    const target = FileSystem.cacheDirectory + name.replace(/[^A-Za-z0-9.-]+/g, '-');
    const { uri, status } = await FileSystem.downloadAsync(url, target, { headers: { Authorization: `Bearer ${token}` } });
    if (status !== 200) {
      let msg = '';
      try { const body = JSON.parse(await FileSystem.readAsStringAsync(uri)); msg = body?.detail || ''; } catch (_) {}
      return msg || (status === 403 ? 'You do not have access to download this.' : `Could not build the sheet (HTTP ${status}). Try again.`);
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
