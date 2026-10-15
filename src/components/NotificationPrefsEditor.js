// Which notifications a designation (or one person) gets — the Notifications tab of
// the designation permissions, and the per-person sheet in User Management. Mirrors
// vistaraweb/src/components/NotificationPrefsEditor.js; the list of kinds comes from
// the server so web, app and the sender agree.
//
// Per kind: Push (bell + phone) / In-app (bell only) / Off; team alerts also choose how
// many levels up they go and whether they come as one morning summary instead.
// `inherit` (person mode): the designation's settings — each row then also offers
// "Default", which follows the designation.
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../constants/theme';
import { GROUPS } from '../lib/moduleGroups';

const MODES = [['push', 'Push'], ['inapp', 'In-app'], ['off', 'Off']];
// Each module's display name, as on the home screen (AR → "Accounts Receivable").
const MODULE_TITLE = Object.fromEntries(GROUPS.flatMap((g) => g.parts.filter((p) => p.module).map((p) => [p.module, p.title])));
const LEVELS = [1, 2, 3, 4, 5];

// `modules`: the modules this designation's menu answers for (or the person's modules);
// only their notifications are listed, a section per module. Channel Partner shares the
// Sales notifications. Left out → every module. Same as the website.
export default function NotificationPrefsEditor({ kinds = [], presets = [], fallback, value, onChange, inherit = null, inheritLabel = 'the designation', modules = null }) {
  const base = fallback || { mode: 'push', levels: 5, digest: false };
  const groups = useMemo(() => {
    const has = (m) => !modules || modules.includes(m) || (m === 'Sales' && modules.includes('Channel Partner'));
    const out = [];
    kinds.filter((k) => has(k.module || 'Sales')).forEach((k) => {
      const m = k.module || 'Sales';
      let g = out.find((x) => x.module === m);
      if (!g) { g = { module: m, name: MODULE_TITLE[m] || m, items: [] }; out.push(g); }
      g.items.push(k);
    });
    return out;
  }, [kinds, modules]);

  const personMode = inherit !== null;
  const own = (k) => (value || {})[k];
  const fromDesig = (k) => ({ ...base, ...((inherit || {})[k] || {}) });
  const effective = (k) => ({ ...(personMode ? fromDesig(k) : base), ...(own(k) || {}) });
  const set = (k, patch) => onChange({ ...(value || {}), [k]: { ...effective(k), ...patch } });
  const clearOne = (k) => { const next = { ...(value || {}) }; delete next[k]; onChange(next); };
  const modeLabel = (m) => (MODES.find(([v]) => v === m) || [m, m])[1];

  return (
    <View>
      {!personMode && presets.length > 0 && groups.some((g) => g.items.some((k) => k.team)) ? (
        <View style={s.presets}>
          <Text style={s.presetLead}>Start from</Text>
          {presets.map((p) => (
            <TouchableOpacity key={p.key} style={s.preset} onPress={() => onChange({ ...p.prefs })}>
              <Text style={s.presetText}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      {!groups.length ? <Text style={s.help}>No notifications belong to the modules in this menu.</Text> : null}
      {groups.map((g) => (
        <View key={g.module} style={s.card}>
          <Text style={s.group}>{g.name.toUpperCase()}</Text>
          {g.items.map((k, idx) => {
            // Sub-headings only where a module has more than one kind of alert (Sales).
            const newSub = new Set(g.items.map((x) => x.group)).size > 1 && (idx === 0 || g.items[idx - 1].group !== k.group);
            const e = effective(k.key);
            const isDefault = personMode && !own(k.key);
            return (
              <View key={k.key} style={s.row}>
                {newSub ? <Text style={s.sub}>{k.group.toUpperCase()}</Text> : null}
                <View style={s.titleRow}>
                  <Text style={e.mode === 'off' ? s.labelOff : s.label}>{k.label}</Text>
                  {k.team ? <Text style={s.team}>TEAM</Text> : null}
                </View>
                <Text style={s.help}>{k.help}</Text>
                {personMode ? (
                  <Text style={s.inherit}>{isDefault ? `Following ${inheritLabel}: ${modeLabel(fromDesig(k.key).mode)}` : 'Set for this person'}</Text>
                ) : null}
                <View style={s.seg}>
                  {personMode ? (
                    <TouchableOpacity style={isDefault ? s.segOn : s.segBtn} onPress={() => clearOne(k.key)}>
                      <Text style={isDefault ? s.segTextOn : s.segText}>Default</Text>
                    </TouchableOpacity>
                  ) : null}
                  {MODES.map(([m, label]) => {
                    const on = !isDefault && e.mode === m;
                    return (
                      <TouchableOpacity key={m} style={on ? s.segOn : s.segBtn} onPress={() => set(k.key, { mode: m })}>
                        <Text style={on ? s.segTextOn : s.segText}>{label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {k.team && e.mode !== 'off' ? (
                  <View style={s.teamBox}>
                    <Text style={s.teamLabel}>Levels up</Text>
                    <View style={s.levels}>
                      {LEVELS.map((n) => {
                        const on = (e.levels || 5) === n;
                        return (
                          <TouchableOpacity key={n} disabled={isDefault} onPress={() => set(k.key, { levels: n })}
                            style={on ? s.levelOn : s.level}>
                            <Text style={on ? s.levelTextOn : s.levelText}>{n}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <Text style={s.teamHint}>{(e.levels || 5) === 1 ? 'Direct manager only' : `Up to ${e.levels || 5} managers up`}</Text>
                    <TouchableOpacity disabled={isDefault} onPress={() => set(k.key, { digest: !e.digest })}
                      style={e.digest ? s.digestOn : s.digest}>
                      <Ionicons name={e.digest ? 'checkbox' : 'square-outline'} size={16} color={e.digest ? COLORS.link : COLORS.textSecondary} />
                      <Text style={e.digest ? s.digestTextOn : s.digestText}>Morning summary instead</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const pill = { paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.pill };
const s = StyleSheet.create({
  presets: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 12 },
  presetLead: { fontSize: 11.5, fontWeight: '700', color: COLORS.textSecondary, marginRight: 2 },
  preset: { ...pill, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  presetText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  card: { borderWidth: 1, borderColor: COLORS.cardBorder, backgroundColor: COLORS.surface2, borderRadius: RADIUS.lg, padding: 12, marginTop: 12 },
  group: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8, color: COLORS.textSecondary, marginBottom: 4 },
  sub: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, color: COLORS.textTertiary, marginBottom: 2 },
  row: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  labelOff: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  team: { fontSize: 9.5, fontWeight: '800', color: COLORS.warning, backgroundColor: COLORS.warningBg, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999, overflow: 'hidden' },
  help: { fontSize: 11.5, color: COLORS.textSecondary, lineHeight: 16 },
  inherit: { fontSize: 11.5, fontWeight: '600', color: COLORS.link },
  seg: { flexDirection: 'row', alignSelf: 'flex-start', padding: 3, borderRadius: RADIUS.pill, backgroundColor: COLORS.surfaceAlt, gap: 2, marginTop: 6 },
  segBtn: { ...pill },
  segOn: { ...pill, backgroundColor: COLORS.surface },
  segText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  segTextOn: { fontSize: 12, fontWeight: '700', color: COLORS.link },
  teamBox: { marginTop: 8, padding: 10, borderRadius: RADIUS.md, backgroundColor: COLORS.surface, gap: 6 },
  teamLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.4, color: COLORS.textSecondary },
  levels: { flexDirection: 'row', gap: 6 },
  level: { width: 36, height: 32, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  levelOn: { width: 36, height: 32, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.link, backgroundColor: COLORS.accentSoft },
  levelText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  levelTextOn: { fontSize: 13, fontWeight: '800', color: COLORS.link },
  teamHint: { fontSize: 11, color: COLORS.textSecondary },
  digest: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', ...pill, borderWidth: 1, borderColor: COLORS.border },
  digestOn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', ...pill, borderWidth: 1, borderColor: COLORS.link, backgroundColor: COLORS.accentSoft },
  digestText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  digestTextOn: { fontSize: 12, fontWeight: '700', color: COLORS.link },
});
