import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { COLORS, RADIUS } from '../constants/theme';
import { BASE_URL } from '../constants/api';
import { apiFetch } from '../utils/apiFetch';

// The role filter on top of a module's dashboard — the same one the website
// shows. It answers one question: what does each role open here? Copy hands the
// dashboard you are looking at to another role, and the chips move with it, so
// copying Manager onto Employee makes the Employee chip open the manager's desk.
// Designation Master → Permissions still pins one to a designation, and wins.
//
// None of this changes what the figures count: every list is scoped to the
// signed-in person by role and the reporting tree.
export default function DashboardRoleFilter({ options, value, onChange, module, roles }) {
  const companyId = useSelector((st) => st.adminFilter?.companyId);
  const [copying, setCopying] = useState(false);
  const [picked, setPicked] = useState([]);
  const [given, setGiven] = useState({});   // role → the dashboard it was handed
  const [role, setRole] = useState('');     // the role being previewed; '' is mine

  // What each role opens today. Without this the chips would only ever show the
  // dashboard originally built for a role, so a copy looked like it did nothing.
  useEffect(() => {
    if (!module) return undefined;
    let alive = true;
    const q = `?module=${encodeURIComponent(module)}${companyId ? `&company_id=${companyId}` : ''}`;
    apiFetch(`${BASE_URL}/api/auth/role-dashboards/${q}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        if (alive) setGiven(Object.fromEntries((rows || []).map((r) => [r.role, r.view])));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [module, companyId]);

  // The dashboards this module has, grouped by the role they were built for.
  const byRole = useMemo(() => {
    const m = new Map();
    for (const o of options || []) {
      if (!o.role) continue;
      if (!m.has(o.role)) m.set(o.role, []);
      m.get(o.role).push(o);
    }
    return m;
  }, [options]);

  const roleList = roles || [...byRole.keys()];
  if (!options?.length) return null;

  // A role opens what it was given, or failing that the dashboard built for it.
  const viewFor = (r) => given[r] || byRole.get(r)?.[0]?.key || '';
  const labelOf = (key) => options.find((o) => o.key === key)?.label || '';
  const current = options.find((o) => o.key === value);
  // Sales has two dashboards for Employee (the call queue and the executive's own
  // pipeline). When a role has more than one, offer the choice rather than
  // silently previewing the first.
  const choices = role ? (byRole.get(role) || []) : [];

  const pickRole = (r) => { setRole(r); onChange(r ? viewFor(r) : ''); };

  const copy = async () => {
    if (!picked.length || !current) return;
    const r = await apiFetch(`${BASE_URL}/api/auth/role-dashboards/`, {
      method: 'POST',
      body: JSON.stringify({ module, view: current.key, roles: picked, ...(companyId ? { company_id: companyId } : {}) }),
    }).catch(() => null);
    if (!r || !r.ok) { Alert.alert('Could not copy', 'Please try again.'); return; }
    // Show it straight away, so the chips agree with what was just saved.
    setGiven((g) => ({ ...g, ...Object.fromEntries(picked.map((x) => [x, current.key])) }));
    Alert.alert('Copied', `${current.label || current.key} is now what ${picked.join(' and ')} opens.`);
    setCopying(false); setPicked([]);
  };

  return (
    <View style={s.wrap}>
      <Text style={s.lead}>Role</Text>
      <Pressable onPress={() => pickRole('')} style={[s.chip, !role && s.chipOn]}>
        <Text style={[s.text, !role && s.textOn]}>Mine</Text>
      </Pressable>
      {roleList.map((r) => (
        <Pressable key={r} onPress={() => pickRole(r)} style={[s.chip, role === r && s.chipOn]}>
          <Text style={[s.text, role === r && s.textOn]}>{r}</Text>
          {given[r] ? <Text style={s.sub}> · {labelOf(given[r])}</Text> : null}
        </Pressable>
      ))}

      {choices.length > 1 ? (
        <>
          <Text style={s.lead}>Dashboard</Text>
          {choices.map((o) => (
            <Pressable key={o.key} onPress={() => onChange(o.key)} style={[s.chip, value === o.key && s.chipOn]}>
              <Text style={[s.text, value === o.key && s.textOn]}>{o.label}</Text>
            </Pressable>
          ))}
        </>
      ) : null}

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
  sub: { fontSize: 10.5, fontWeight: '600', color: COLORS.textSecondary },
});
