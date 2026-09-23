import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../../constants/theme';
import { BASE_URL } from '../../constants/api';
import { apiFetch } from '../../utils/apiFetch';
import FormSheet from '../../components/FormSheet';
import FilterSelect from '../../components/FilterSelect';
import { Button } from '../../components/ui';

// What a designation may do, per company — the same editor as Designation Master
// on the website. The list of capabilities comes from the server; the ticks are
// this company's own answer.
export default function PermissionsSheet({ designation, visible, onClose, onSaved }) {
  const [catalogue, setCatalogue] = useState(null);
  const [caps, setCaps] = useState([]);
  const [scope, setScope] = useState('');
  const [screens, setScreens] = useState([]);
  const [dash, setDash] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!visible || !designation) return;
    setErr('');
    setCaps(designation.effective_capabilities || designation.capabilities || []);
    setScope(designation.data_scope || '');
    setScreens(designation.effective_screens || designation.screens || []);
    setDash(designation.dashboard || '');
    apiFetch(`${BASE_URL}/api/auth/designations/capabilities/`)
      .then((r) => r.json()).then(setCatalogue)
      .catch(() => setErr('Could not load the permission list.'));
  }, [visible, designation?.id]);

  const toggle = (key) => setCaps((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  const toggleScreen = (key) => setScreens((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const save = async () => {
    setSaving(true); setErr('');
    try {
      const r = await apiFetch(`${BASE_URL}/api/auth/designations/${designation.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ capabilities: caps, data_scope: scope, screens, dashboard: dash }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.detail || 'Could not save.'); return; }
      onSaved?.(d);
      onClose();
    } catch (e) {
      setErr('Could not save. Check your connection.');
    } finally { setSaving(false); }
  };

  if (!designation) return null;
  const modules = catalogue ? [...new Set(catalogue.capabilities.map((c) => c.module))] : [];

  return (
    <FormSheet visible={visible} onClose={onClose}>
      <View style={s.head}>
        <Text style={s.title} numberOfLines={1}>{designation.name}</Text>
        <Text style={s.sub}>What this designation may do</Text>
      </View>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {err ? <Text style={s.err}>{err}</Text> : null}
        {!designation.capabilities_set ? (
          <Text style={s.note}>Nobody has set this designation up yet, so it is ticked with what the title already allows today. Saving makes it explicit.</Text>
        ) : null}
        {!catalogue ? <Text style={s.muted}>Loading…</Text> : (
          <>
            <Text style={s.section}>START FROM</Text>
            <View style={s.presets}>
              {catalogue.presets.map((p) => (
                <TouchableOpacity key={p.key} style={s.preset} activeOpacity={0.8}
                  onPress={() => { setCaps(p.capabilities); setScreens(p.screens || []); }}>
                  <Text style={s.presetText}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {modules.map((mod) => (
              <View key={mod}>
                <Text style={s.section}>{mod.toUpperCase()}</Text>
                {catalogue.capabilities.filter((c) => c.module === mod).map((c) => {
                  const on = caps.includes(c.key);
                  return (
                    <TouchableOpacity key={c.key} activeOpacity={0.8} onPress={() => toggle(c.key)}
                      style={[s.row, on && s.rowOn]}>
                      <Ionicons name={on ? 'checkbox' : 'square-outline'} size={19} color={on ? COLORS.link : COLORS.textTertiary} />
                      <View style={s.flex}>
                        <Text style={s.rowLabel}>{c.label}</Text>
                        <Text style={s.rowHelp}>{c.help}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            <Text style={s.section}>MENU — WHICH SCREENS THEY SEE</Text>
            {[...new Set((catalogue.screens || []).map((c) => c.module))].map((mod) => (
              <View key={mod} style={s.screenGroup}>
                <Text style={s.screenMod}>{mod}</Text>
                <View style={s.presets}>
                  {(catalogue.screens || []).filter((c) => c.module === mod).map((c) => {
                    const on = screens.includes(c.key);
                    return (
                      <TouchableOpacity key={c.key} activeOpacity={0.8} onPress={() => toggleScreen(c.key)}
                        style={[s.preset, on && s.presetOn]}>
                        <Text style={[s.presetText, on && s.presetTextOn]}>{c.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            <Text style={s.section}>WHICH DASHBOARD OPENS</Text>
            <FilterSelect label="Dashboard" value={dash} onChange={setDash}
              options={(catalogue.dashboards || []).map((d) => ({ value: d.value, label: d.label }))} />

            <Text style={s.section}>WHOSE RECORDS THEY SEE</Text>
            <FilterSelect label="Scope" value={scope} onChange={setScope}
              options={catalogue.scopes.map((sc) => ({ value: sc.value, label: sc.label }))} />

            <View style={s.actions}>
              <Button title="Cancel" variant="secondary" size="sm" onPress={onClose} disabled={saving} />
              <Button title="Save permissions" size="sm" onPress={save} loading={saving} />
            </View>
          </>
        )}
      </ScrollView>
    </FormSheet>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  head: { paddingHorizontal: 20, paddingBottom: 6 },
  title: { fontSize: 18, lineHeight: 24, fontWeight: '800', color: COLORS.textPrimary },
  sub: { fontSize: 12.5, color: COLORS.textSecondary, marginTop: 2 },
  scroll: { flexShrink: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  err: { color: COLORS.error, fontSize: 13, marginVertical: 8 },
  muted: { color: COLORS.textSecondary, fontSize: 13, paddingVertical: 14 },
  note: { fontSize: 12.5, lineHeight: 18, color: COLORS.link, backgroundColor: COLORS.accentSoft,
          borderRadius: RADIUS.md, padding: 10, marginTop: 10 },
  section: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8, color: COLORS.textSecondary, marginTop: 16, marginBottom: 8 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  preset: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1,
            borderColor: COLORS.border, backgroundColor: COLORS.surface },
  presetText: { fontSize: 12.5, fontWeight: '700', color: COLORS.textSecondary },
  presetOn: { borderColor: COLORS.link, backgroundColor: COLORS.accentSoft },
  presetTextOn: { color: COLORS.link },
  screenGroup: { marginBottom: 10 },
  screenMod: { fontSize: 11, fontWeight: '800', color: COLORS.textSecondary, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 14,
         borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, marginBottom: 6 },
  rowOn: { borderColor: COLORS.link, backgroundColor: COLORS.accentSoft },
  rowLabel: { fontSize: 13.5, fontWeight: '700', color: COLORS.textPrimary },
  rowHelp: { fontSize: 11.5, lineHeight: 16, color: COLORS.textSecondary, marginTop: 2 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 18 },
});
