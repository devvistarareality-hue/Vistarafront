import React, { useState } from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../constants/theme';
import { BASE_URL } from '../constants/api';
import { apiFetch } from '../utils/apiFetch';

// The role filter on top of a module's dashboard — the same one the website
// shows. An admin flips between the dashboards built for each role, and Copy
// hands the one they are looking at to another role, so (say) a General Manager
// opens the same dashboard as a Manager. Designation Master → Permissions pins
// it to a designation.
//
// None of this changes what the figures count: every list is scoped to the
// signed-in person by role and the reporting tree.
export default function DashboardRoleFilter({ options, value, onChange, module, roles }) {
  const [copying, setCopying] = useState(false);
  const [picked, setPicked] = useState([]);
  if (!options?.length) return null;

  const roleList = roles || [...new Set(options.map((o) => o.role).filter(Boolean))];
  const current = options.find((o) => o.key === value);

  const copy = async () => {
    if (!picked.length || !current) return;
    const r = await apiFetch(`${BASE_URL}/api/auth/role-dashboards/`, {
      method: 'POST',
      body: JSON.stringify({ module, view: current.key, roles: picked }),
    }).catch(() => null);
    if (!r || !r.ok) { Alert.alert('Could not copy', 'Please try again.'); return; }
    Alert.alert('Copied', `${current.label || current.key} is now what ${picked.join(' and ')} opens.`);
    setCopying(false); setPicked([]);
  };

  return (
    <View style={s.wrap}>
      <Text style={s.lead}>Role</Text>
      <Pressable onPress={() => onChange('')} style={[s.chip, !value && s.chipOn]}>
        <Text style={[s.text, !value && s.textOn]}>Mine</Text>
      </Pressable>
      {options.map((o) => (
        <Pressable key={o.key} onPress={() => onChange(o.key)} style={[s.chip, value === o.key && s.chipOn]}>
          <Text style={[s.text, value === o.key && s.textOn]}>{o.label}</Text>
        </Pressable>
      ))}

      {module && current ? (copying ? (
        <>
          <Text style={s.lead}>Give this to</Text>
          {roleList.map((r) => (
            <Pressable key={r} onPress={() => setPicked((p) => (
              p.includes(r) ? p.filter((x) => x !== r) : [...p, r]))}
              style={[s.chip, picked.includes(r) && s.chipOn]}>
              <Text style={[s.text, picked.includes(r) && s.textOn]}>{r}</Text>
            </Pressable>
          ))}
          <Pressable onPress={copy} disabled={!picked.length} style={[s.chip, s.chipGo, !picked.length && s.dim]}>
            <Text style={[s.text, s.textGo]}>Copy</Text>
          </Pressable>
          <Pressable onPress={() => { setCopying(false); setPicked([]); }} style={s.chip}>
            <Text style={s.text}>Cancel</Text>
          </Pressable>
        </>
      ) : (
        <Pressable onPress={() => setCopying(true)} style={s.chip}>
          <Ionicons name="copy-outline" size={12} color={COLORS.textSecondary} />
          <Text style={s.text}> Copy to role</Text>
        </Pressable>
      )) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6,
          paddingHorizontal: 16, paddingBottom: 8 },
  lead: { fontSize: 11.5, fontWeight: '700', color: COLORS.textSecondary, marginRight: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, paddingVertical: 6,
          borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  chipOn: { borderColor: COLORS.link, backgroundColor: COLORS.accentSoft },
  chipGo: { borderColor: COLORS.link, backgroundColor: COLORS.link },
  dim: { opacity: 0.5 },
  text: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  textOn: { color: COLORS.link },
  textGo: { color: COLORS.textInverse },
});
