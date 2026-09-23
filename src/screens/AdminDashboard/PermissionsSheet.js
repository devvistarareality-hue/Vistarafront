import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../../constants/theme';
import { BASE_URL } from '../../constants/api';
import { apiFetch } from '../../utils/apiFetch';
import FormSheet from '../../components/FormSheet';
import { Button, Segmented } from '../../components/ui';
import FilterSelect from '../../components/FilterSelect';

// What a designation may do, per company — the same editor as Designation Master
// on the website, in the same three tabs: what they do, which menu they see, and
// where they land. The vocabulary comes from the server; the ticks are this
// company's own answer, so the same title can mean something else elsewhere.
const TABS = [
  { value: 'actions', label: 'Actions' },
  { value: 'menu', label: 'Menu' },
  { value: 'view', label: 'Dashboard' },
];

export default function PermissionsSheet({ designation, others, visible, onClose, onSaved }) {
  const [catalogue, setCatalogue] = useState(null);
  const [tab, setTab] = useState('actions');
  // The Dashboard tab lists one view per role per module; this narrows it.
  const [dashRole, setDashRole] = useState('');
  // Copying from a designation that is already set up.
  const [copyFrom, setCopyFrom] = useState('');
  const [caps, setCaps] = useState([]);
  const [scope, setScope] = useState('');
  const [screens, setScreens] = useState([]);
  const [dash, setDash] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!visible || !designation) return;
    setErr(''); setTab('actions');
    setCaps(designation.effective_capabilities || designation.capabilities || []);
    setScope(designation.data_scope || '');
    setScreens(designation.effective_screens || designation.screens || []);
    setDash(designation.dashboard || '');
    apiFetch(`${BASE_URL}/api/auth/designations/capabilities/`)
      .then((r) => r.json()).then(setCatalogue)
      .catch(() => setErr('Could not load the permission list.'));
  }, [visible, designation?.id]);

  const flip = (setter) => (key) => setter((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  const toggle = flip(setCaps);
  const toggleScreen = flip(setScreens);

  const sourceRow = (others || []).find((d) => String(d.id) === String(copyFrom));
  const copyAll = () => {
    if (!sourceRow) return;
    setCaps(sourceRow.effective_capabilities || sourceRow.capabilities || []);
    setScreens(sourceRow.effective_screens || sourceRow.screens || []);
    setDash(sourceRow.dashboard || '');
    setScope(sourceRow.data_scope || '');
  };
  const copyDashboard = () => { if (sourceRow) setDash(sourceRow.dashboard || ''); };

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

  // A designation belongs to one module and only decides that module — a Sales
  // title has nothing to say about Channel Partner or AR, and vice versa.
  const ALIAS = { 'Accounts Receivable': 'AR' };
  const mine = [ALIAS[designation?.module] || designation?.module];
  const group = (rows) => {
    const own = (rows || []).filter((c) => mine.includes(c.module));
    const mods = [...new Set(own.map((c) => c.module))];
    return mods.map((m) => ({ module: m, items: own.filter((c) => c.module === m) }));
  };
  const byModule = useMemo(() => group(catalogue?.capabilities), [catalogue]);
  const screensByModule = useMemo(() => group(catalogue?.screens), [catalogue]);

  if (!designation) return null;
  const tabs = TABS.map((t) => ({
    ...t,
    label: t.value === 'actions' ? `Actions ${caps.length}`
      : t.value === 'menu' ? `Menu ${screens.length}` : t.label,
  }));

  return (
    <FormSheet visible={visible} onClose={onClose}>
      <View style={s.head}>
        <View style={s.badge}><Ionicons name="shield-checkmark" size={17} color={COLORS.link} /></View>
        <View style={s.flex}>
          <Text style={s.title} numberOfLines={1}>{designation.name}</Text>
          <Text style={s.sub} numberOfLines={1}>{designation.module} · {designation.company_name || 'this company'}</Text>
        </View>
        <Pressable onPress={onClose} hitSlop={10} style={s.x}>
          <Ionicons name="close" size={18} color={COLORS.textSecondary} />
        </Pressable>
      </View>

      <View style={s.tabWrap}>
        <Segmented options={tabs} value={tab} onChange={setTab} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {err ? <Text style={s.err}>{err}</Text> : null}
        {(others || []).length > 1 ? (
          <View style={s.copyBox}>
            <Text style={s.copyLead}>COPY FROM ANOTHER DESIGNATION</Text>
            <FilterSelect label="Designation" value={copyFrom} onChange={setCopyFrom}
              options={(others || []).filter((d) => d.id !== designation.id)
                .map((d) => ({ value: String(d.id), label: `${d.name} · ${d.module}` }))} />
            <View style={s.copyBtns}>
              <Button title="Everything" variant="secondary" size="sm" disabled={!sourceRow} onPress={copyAll} />
              <Button title="Dashboard only" variant="secondary" size="sm" disabled={!sourceRow} onPress={copyDashboard} />
            </View>
            <Text style={s.copyHint}>Nothing is saved until you press Save.</Text>
          </View>
        ) : null}
        {!designation.capabilities_set ? (
          <Text style={s.note}>Ticked with what this title already allows today. Saving makes it explicit for this company.</Text>
        ) : null}

        {!catalogue ? <Text style={s.muted}>Loading…</Text> : tab === 'actions' ? (
          <>
            <View style={s.presetRow}>
              <Text style={s.presetLead}>Start from</Text>
              {catalogue.presets.filter((p) => !p.module || mine.includes(p.module)).map((p) => (
                <Pressable key={p.key} style={s.preset}
                  onPress={() => { setCaps(p.capabilities); setScreens(p.screens || []); }}>
                  <Text style={s.presetText}>{p.label}</Text>
                </Pressable>
              ))}
            </View>

            {!byModule.length ? (
              <Text style={s.note}>
                {designation.module} has no switchable actions yet — everyone with the module can do
                what it offers. Its menu and dashboard are on the other tabs.
              </Text>
            ) : null}
            {byModule.map(({ module, items }) => {
              const on = items.filter((c) => caps.includes(c.key)).length;
              const allOn = on === items.length;
              return (
                <View key={module} style={s.card}>
                  <View style={s.cardHead}>
                    <Text style={s.cardTitle}>{module.toUpperCase()}</Text>
                    <Text style={s.count}>{on} of {items.length}</Text>
                    <Pressable style={s.all} onPress={() => setCaps((prev) => (allOn
                      ? prev.filter((k) => !items.some((c) => c.key === k))
                      : [...new Set([...prev, ...items.map((c) => c.key)])]))}>
                      <Text style={s.allText}>{allOn ? 'Clear' : 'All'}</Text>
                    </Pressable>
                  </View>
                  {items.map((c) => {
                    const isOn = caps.includes(c.key);
                    return (
                      <Pressable key={c.key} onPress={() => toggle(c.key)} style={[s.row, isOn && s.rowOn]}>
                        <View style={s.flex}>
                          <Text style={s.rowLabel}>{c.label}</Text>
                          <Text style={s.rowHelp}>{c.help}</Text>
                        </View>
                        <View style={[s.track, isOn && s.trackOn]}>
                          <View style={[s.knob, isOn && s.knobOn]} />
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}
          </>
        ) : tab === 'menu' ? (
          <>
            <Text style={s.lead}>Tap a screen to show or hide it for this designation.</Text>
            {screensByModule.map(({ module, items }) => (
              <View key={module} style={s.card}>
                <View style={s.cardHead}>
                  <Text style={s.cardTitle}>{module.toUpperCase()}</Text>
                  <Text style={s.count}>{items.filter((c) => screens.includes(c.key)).length} of {items.length}</Text>
                </View>
                <View style={s.chips}>
                  {items.map((c) => {
                    const isOn = screens.includes(c.key);
                    return (
                      <Pressable key={c.key} onPress={() => toggleScreen(c.key)} style={[s.chip, isOn && s.chipOn]}>
                        {isOn ? <Ionicons name="checkmark" size={13} color={COLORS.link} /> : null}
                        <Text style={[s.chipText, isOn && s.chipTextOn]}>{c.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </>
        ) : (
          <>
            <View style={s.card}>
              <View style={s.cardHead}>
                <Ionicons name="grid-outline" size={14} color={COLORS.textSecondary} />
                <Text style={s.cardTitle}>WHICH DASHBOARD OPENS</Text>
              </View>
              <View style={s.chips}>
                {['', ...(catalogue.dashboard_roles || [])].map((r) => (
                  <Pressable key={r || 'all'} onPress={() => setDashRole(r)} style={[s.chip, dashRole === r && s.chipOn]}>
                    <Text style={[s.chipText, dashRole === r && s.chipTextOn]}>{r || 'All roles'}</Text>
                  </Pressable>
                ))}
              </View>
              {(catalogue.dashboards || [])
                .filter((d) => !d.module || mine.includes(d.module))
                .filter((d) => !dashRole || !d.role || d.role === dashRole)
                .map((d) => {
                const isOn = dash === d.value;
                return (
                  <Pressable key={d.value || 'auto'} onPress={() => setDash(d.value)} style={[s.row, isOn && s.rowOn]}>
                    <View style={[s.radio, isOn && s.radioOn]}>{isOn ? <View style={s.dot} /> : null}</View>
                    <View style={s.flex}>
                      <Text style={s.rowLabel}>{d.label}</Text>
                      {d.module ? (
                        <Text style={s.rowHelp}>
                          {d.module}{d.role ? ` · ${d.role}` : ''}
                          {d.built === false ? ' · not built yet — opens the current dashboard' : ''}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <View style={s.card}>
              <View style={s.cardHead}>
                <Ionicons name="eye-outline" size={14} color={COLORS.textSecondary} />
                <Text style={s.cardTitle}>WHOSE RECORDS THEY SEE</Text>
              </View>
              {(catalogue.scopes || []).map((sc) => {
                const isOn = scope === sc.value;
                return (
                  <Pressable key={sc.value || 'default'} onPress={() => setScope(sc.value)} style={[s.row, isOn && s.rowOn]}>
                    <View style={[s.radio, isOn && s.radioOn]}>{isOn ? <View style={s.dot} /> : null}</View>
                    <Text style={[s.rowLabel, s.flex]}>{sc.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      <View style={s.foot}>
        <Text style={s.summary} numberOfLines={1}>
          {caps.length} action{caps.length === 1 ? '' : 's'} · {screens.length} screen{screens.length === 1 ? '' : 's'}
        </Text>
        <View style={s.footBtns}>
          <Button title="Cancel" variant="secondary" size="sm" onPress={onClose} disabled={saving} />
          <Button title="Save" size="sm" onPress={save} loading={saving} disabled={!catalogue} />
        </View>
      </View>
    </FormSheet>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingBottom: 10 },
  badge: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
           backgroundColor: COLORS.accentSoft, borderWidth: 1, borderColor: COLORS.border },
  title: { fontSize: 17, lineHeight: 23, fontWeight: '800', color: COLORS.textPrimary },
  sub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  x: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
       backgroundColor: COLORS.surfaceAlt },
  tabWrap: { paddingHorizontal: 20, paddingBottom: 6 },
  scroll: { flexShrink: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 12 },
  err: { color: COLORS.danger, fontSize: 13, marginVertical: 8 },
  copyBox: { marginTop: 12, padding: 12, borderRadius: RADIUS.lg, borderWidth: 1,
             borderColor: COLORS.cardBorder, backgroundColor: COLORS.surface2 },
  copyLead: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8, color: COLORS.textSecondary, marginBottom: 8 },
  copyBtns: { flexDirection: 'row', gap: 8, marginTop: 8 },
  copyHint: { fontSize: 11, color: COLORS.textTertiary, marginTop: 6 },
  muted: { color: COLORS.textSecondary, fontSize: 13, paddingVertical: 14 },
  lead: { fontSize: 12.5, color: COLORS.textSecondary, marginTop: 10 },
  note: { fontSize: 12.5, lineHeight: 18, color: COLORS.link, backgroundColor: COLORS.accentSoft,
          borderRadius: RADIUS.md, padding: 10, marginTop: 10 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 12 },
  presetLead: { fontSize: 11.5, fontWeight: '700', color: COLORS.textSecondary, marginRight: 2 },
  preset: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.pill, borderWidth: 1,
            borderColor: COLORS.border, backgroundColor: COLORS.surface },
  presetText: { fontSize: 12.5, fontWeight: '700', color: COLORS.textSecondary },
  card: { borderWidth: 1, borderColor: COLORS.cardBorder, backgroundColor: COLORS.surface2,
          borderRadius: RADIUS.lg, padding: 10, marginTop: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, paddingBottom: 8 },
  cardTitle: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8, color: COLORS.textSecondary },
  count: { flex: 1, fontSize: 11.5, color: COLORS.textTertiary },
  all: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill, borderWidth: 1,
         borderColor: COLORS.border, backgroundColor: COLORS.surface },
  allText: { fontSize: 11.5, fontWeight: '700', color: COLORS.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: RADIUS.md,
         borderWidth: 1, borderColor: 'transparent', backgroundColor: COLORS.surface, marginBottom: 6 },
  rowOn: { borderColor: COLORS.border, backgroundColor: COLORS.accentSofter },
  rowLabel: { fontSize: 13.5, fontWeight: '700', color: COLORS.textPrimary },
  rowHelp: { fontSize: 11.5, lineHeight: 16, color: COLORS.textSecondary, marginTop: 2 },
  track: { width: 40, height: 23, borderRadius: 999, padding: 2, backgroundColor: COLORS.surfaceAlt,
           borderWidth: 1, borderColor: COLORS.border },
  trackOn: { backgroundColor: COLORS.link, borderColor: COLORS.link },
  knob: { width: 17, height: 17, borderRadius: 999, backgroundColor: COLORS.surface },
  knobOn: { transform: [{ translateX: 17 }], backgroundColor: COLORS.textInverse },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8,
          borderRadius: RADIUS.pill, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  chipOn: { borderColor: COLORS.link, backgroundColor: COLORS.accentSoft },
  chipText: { fontSize: 12.5, fontWeight: '700', color: COLORS.textSecondary },
  chipTextOn: { color: COLORS.link },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.border,
           alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: COLORS.link },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.link },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 10,
          paddingBottom: 6, borderTopWidth: 1, borderTopColor: COLORS.border },
  summary: { flex: 1, fontSize: 11.5, color: COLORS.textSecondary },
  footBtns: { flexDirection: 'row', gap: 8 },
});
