import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../utils/apiFetch';
import { SALES_ENDPOINTS } from '../constants/api';
import { COLORS } from '../constants/theme';
import FilterSelect from './FilterSelect';

// Download the approved bookings as a workbook — Sales and Channel Partner together,
// which is the point of it: one download covering both sides. Shown only to someone
// granted "Download booking Excel" in User Management, and to real admins; the server
// enforces the same rule, this just avoids offering a button that would be refused.
export function ExportBookings({ projects: given, companyId }) {
  const me = useSelector((s) => s.auth.user);
  const allowed = me?.can_export_bookings || me?.role === 'Admin' || me?.is_staff;
  const [project, setProject] = useState('');
  const [busy, setBusy] = useState(false);
  // The project picker needs ids. A screen that already has the list passes it in;
  // one that doesn't (My Bookings groups by name, not id) gets it fetched here, so
  // this drops into any Sales screen unchanged.
  const [fetched, setFetched] = useState([]);
  const projects = given || fetched;

  useEffect(() => {
    if (given || !allowed) return;
    apiFetch(SALES_ENDPOINTS.projects + (companyId ? `?company_id=${companyId}` : ''))
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setFetched(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [given, allowed, companyId]);

  if (!allowed) return null;

  async function download() {
    setBusy(true);
    try {
      const qs = [project ? `project=${project}` : '', companyId ? `company_id=${companyId}` : '']
        .filter(Boolean).join('&');
      const token = await AsyncStorage.getItem('access_token');
      const name = `Bookings-${(projects.find(p => String(p.id) === String(project))?.name || 'All-Projects').replace(/[^A-Za-z0-9]+/g, '-')}.xlsx`;
      const target = FileSystem.cacheDirectory + name;
      const { uri, status } = await FileSystem.downloadAsync(
        `${SALES_ENDPOINTS.bookingsExport}${qs ? `?${qs}` : ''}`, target,
        { headers: { Authorization: `Bearer ${token}` } });
      if (status === 403) { Alert.alert('No access', 'You do not have access to download booking data.'); return; }
      if (status !== 200) { Alert.alert('Download failed', 'Could not build the sheet. Try again.'); return; }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Approved bookings', UTI: 'org.openxmlformats.spreadsheetml.sheet' });
      } else {
        Alert.alert('Saved', 'Sheet saved to:\n' + uri);
      }
    } catch (e) {
      Alert.alert('Download failed', e.message);
    } finally { setBusy(false); }
  }

  return (
    <View style={{ marginBottom: 10 }}>
      {/* Says what the sheet holds, because this control also sits above My Bookings
          and the download is emphatically not that list. */}
      <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 6 }}>
        All approved bookings · Sales + CP
      </Text>
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
      <FilterSelect label="All projects" value={project} onChange={setProject}
        options={[{ value: '', label: 'All projects' },
                  ...projects.map((p) => ({ value: String(p.id), label: p.name }))]}
        style={{ flex: 1 }} />
      <TouchableOpacity onPress={download} disabled={busy}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9,
                 borderRadius: 8, backgroundColor: COLORS.success, opacity: busy ? 0.7 : 1 }}>
        {busy ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="download-outline" size={15} color="#fff" />}
        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{busy ? 'Preparing…' : 'Excel'}</Text>
      </TouchableOpacity>
    </View>
    </View>
  );
}


export default ExportBookings;
