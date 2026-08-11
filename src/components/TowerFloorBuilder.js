import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { uploadToSupabase } from '../utils/supabaseStorage';
import { COLORS } from '../constants/theme';

const NAVY = COLORS.navy; const BLUE = COLORS.link; const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary;

/* Shared by Add/Edit Project and Manage Plots so a tower is defined the same way in
   both — the project modal is the only route in before any units exist. */
/* ── Tower Floor Builder ──
   Plotted schemes get a flat list of plot numbers; a tower (Pratishtha: G+13) is
   defined floor by floor — each floor has its own numbering run and plan drawing.
   Ground is floor 0, so "Shop1-Shop12" on the ground and "101-107" / "201-207"
   upward all come out of the same prefix + from/to rule. Mirrors the web builder. */
const ordinal = (n) => {
  if (n === 0) return 'Ground';
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]) + ' Floor';
};

// A multi-block tower puts the block in front — "A-101" — so unit numbers stay unique
// across blocks that repeat the same numbering, which they normally do.
const blockPrefix = (f) => (f && f.block ? `${f.block}-` : '');
function unitsForFloor(f) {
  const from = parseInt(f.from, 10), to = parseInt(f.to, 10);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return [];
  if (to - from > 200) return [];   // guard against a stray keystroke generating thousands
  const out = [];
  for (let n = from; n <= to; n++) out.push(`${blockPrefix(f)}${f.prefix || ''}${n}`);
  return out;
}
// Distinct blocks in definition order; [''] for a single-block tower.
function blocksOf(floors) {
  const seen = [];
  (floors || []).forEach((f) => { const b = f.block || ''; if (!seen.includes(b)) seen.push(b); });
  return seen.length ? seen : [''];
}

export default function TowerFloorBuilder({ floors, setFloors, folder, existing = new Set(), onPersist, onGenerate, generating = false, note, industrial = false }) {
  const [uploading, setUploading] = useState(null);
  const [msg, setMsg] = useState('');
  const persist = (next) => { if (onPersist) onPersist(next); };
  const commit = (next) => { setFloors(next); persist(next); };
  const edit = (i, patch) => setFloors(floors.map((f, ix) => (ix === i ? { ...f, ...patch } : f)));

  function addFloorRow(block = '') {
    const inBlock = floors.filter((f) => (f.block || '') === block);
    const top = inBlock.reduce((m, f) => Math.max(m, Number(f.floor) || 0), -1) + 1;
    commit([...floors, { block, floor: top, label: ordinal(top), prefix: '', from: top * 100 + 1, to: top * 100 + 7, image_url: '' }]);
  }

  // Blocks are lettered A, B, C… — the next free letter, so adding one is one tap.
  function addBlock() {
    const used = blocksOf(floors).filter(Boolean);
    let letter = 'A';
    for (let i = 0; i < 26; i++) { const c = String.fromCharCode(65 + i); if (!used.includes(c)) { letter = c; break; } }
    const unlettered = floors.some((f) => !(f.block || ''));
    // First block added to an unlettered tower: name the existing floors "A" so the
    // two are distinguishable, rather than a nameless block beside a named one.
    const base = unlettered ? floors.map((f) => ({ ...f, block: f.block || 'A' })) : floors;
    const next = unlettered && letter === 'A' ? 'B' : letter;
    commit([...base, { block: next, floor: 0, label: ordinal(0), prefix: '', from: 1, to: 7, image_url: '' }]);
  }

  // Renaming a block moves every floor under it, so unit numbers follow.
  const renameBlock = (from, to) => commit(floors.map((f) => ((f.block || '') === from ? { ...f, block: to } : f)));

  function removeBlock(block) {
    const n = floors.filter((f) => (f.block || '') === block).length;
    Alert.alert(`Remove Block ${block || '—'}?`, `Its ${n} floor${n === 1 ? '' : 's'} leave the plan. Units already generated are kept.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => commit(floors.filter((f) => (f.block || '') !== block)) },
    ]);
  }

  // Towers repeat: floors 2..13 are usually floor 1 with a different hundreds digit.
  function repeatUpTo(i, topFloor) {
    const src = floors[i], base = Number(src.floor) || 0;
    const span = (parseInt(src.to, 10) || 0) - (parseInt(src.from, 10) || 0);
    const offset = (parseInt(src.from, 10) || 0) - base * 100;
    const blk = src.block || '';
    const next = [...floors];
    for (let fl = base + 1; fl <= topFloor; fl++) {
      // Only within this block — Block B having a 5th floor must not stop Block A getting one.
      if (next.some((f) => (f.block || '') === blk && Number(f.floor) === fl)) continue;
      next.push({ block: blk, floor: fl, label: ordinal(fl), prefix: src.prefix || '',
        from: fl * 100 + offset, to: fl * 100 + offset + span, image_url: src.image_url || '' });
    }
    next.sort((a, b) => String(a.block || '').localeCompare(String(b.block || '')) || (Number(a.floor) || 0) - (Number(b.floor) || 0));
    commit(next);
  }

  function askRepeat(i) {
    Alert.prompt
      ? Alert.prompt('Repeat floor', "Repeat this floor's layout up to which floor?", (v) => { const n = Number(v); if (n) repeatUpTo(i, n); }, 'plain-text', '13', 'number-pad')
      : repeatUpTo(i, 13);   // Android has no Alert.prompt — default to a G+13 tower
  }

  function removeFloor(i) {
    Alert.alert('Remove floor', `Remove ${floors[i].label} from the plan? Units already generated are kept.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => commit(floors.filter((_, ix) => ix !== i)) },
    ]);
  }

  // Plans are shown as images to the buyer, and RN can't rasterise a PDF — so the app
  // takes images only. Use the web for PDF plans; it renders them to PNG on upload.
  async function uploadPlan(i) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (result.canceled) return;
    setUploading(i);
    try {
      const url = await uploadToSupabase(result.assets[0].uri, result.assets[0].mimeType || 'image/jpeg', folder);
      commit(floors.map((x, ix) => (ix === i ? { ...x, image_url: url } : x)));
    } catch (e) { Alert.alert('Upload failed', e.message); }
    setUploading(null);
  }

  const planned = floors.flatMap((f) => unitsForFloor(f).map((number) => ({ number, floor: Number(f.floor) || 0 })));
  const toCreate = planned.filter((u) => !existing.has(u.number));
  const dupes = planned.length - new Set(planned.map((u) => u.number)).size;

  const cell = { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 7, fontSize: 13, color: TEXT, backgroundColor: COLORS.white };
  const lbl = { fontSize: 9, fontWeight: '700', color: COLORS.textTertiary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 };

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, color: MUTED }}>{industrial ? "Define each block's unit numbering and plan once it's surveyed." : "Define each floor's unit numbering and plan. Ground is floor 0."}</Text>
        </View>
        <TouchableOpacity onPress={addBlock} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, borderWidth: 1.5, borderColor: '#C7D2FE' }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: BLUE }}>+ Block</Text>
        </TouchableOpacity>
        {/* Industrial blocks are single-level — no floor concept, so no way to add one. */}
        {!industrial && (
          <TouchableOpacity onPress={() => addFloorRow(blocksOf(floors)[0] || '')} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, borderWidth: 1.5, borderColor: '#C7D2FE' }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: BLUE }}>+ Floor</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Grouped by block. A single-block tower has one unnamed group and looks
          exactly as it did before blocks existed. */}
      {blocksOf(floors).map((blk) => {
        const rows = floors.map((f, i) => ({ f, i })).filter(({ f }) => (f.block || '') === blk);
        if (!rows.length) return null;
        const blkUnits = rows.reduce((n, { f }) => n + unitsForFloor(f).length, 0);
        return (
      <View key={`blk-${blk}`}>
        {(blocksOf(floors).length > 1 || blk) ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 2, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: MUTED, letterSpacing: 0.5 }}>BLOCK</Text>
            <TextInput value={blk} onChangeText={(t) => renameBlock(blk, t.trim().toUpperCase())} placeholder="A"
              style={{ width: 54, height: 34, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 8,
                paddingHorizontal: 8, fontSize: 13, fontWeight: '800', textAlign: 'center', color: TEXT }} />
            <Text style={{ fontSize: 12, color: MUTED }}>{industrial ? `${blkUnits} units` : `${rows.length} floor${rows.length === 1 ? '' : 's'} · ${blkUnits} units`}</Text>
            {!industrial && (
              <TouchableOpacity onPress={() => addFloorRow(blk)} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, borderWidth: 1.5, borderColor: COLORS.border }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: BLUE }}>+ Floor</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => removeBlock(blk)} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, borderWidth: 1.5, borderColor: '#FECACA', backgroundColor: '#FEF2F2' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#DC2626' }}>Remove</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      {rows.map(({ f, i }) => {
        const units = unitsForFloor(f);
        const isNew = units.filter((n) => !existing.has(n)).length;
        return (
          <View key={i} style={{ borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, padding: 12, marginTop: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {/* Industrial blocks are single-level — the floor number is meaningless. */}
              {!industrial && (
                <View style={{ width: 52 }}><Text style={lbl}>Floor</Text>
                  <TextInput value={String(f.floor ?? '')} onChangeText={(v) => edit(i, { floor: v })} onBlur={() => persist(floors)} keyboardType="number-pad" style={cell} /></View>
              )}
              <View style={{ flex: 1 }}><Text style={lbl}>Label</Text>
                <TextInput value={f.label || ''} onChangeText={(v) => edit(i, { label: v })} onBlur={() => persist(floors)} style={cell} /></View>
              <TouchableOpacity onPress={() => removeFloor(i)} style={{ justifyContent: 'flex-end', paddingBottom: 7 }}>
                <Ionicons name="trash-outline" size={18} color={COLORS.error} />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <View style={{ flex: 1 }}><Text style={lbl}>Prefix</Text>
                <TextInput value={f.prefix || ''} placeholder="e.g. Shop" placeholderTextColor="#9CA3AF" onChangeText={(v) => edit(i, { prefix: v })} onBlur={() => persist(floors)} style={cell} /></View>
              <View style={{ width: 72 }}><Text style={lbl}>From</Text>
                <TextInput value={String(f.from ?? '')} onChangeText={(v) => edit(i, { from: v })} onBlur={() => persist(floors)} keyboardType="number-pad" style={cell} /></View>
              <View style={{ width: 72 }}><Text style={lbl}>To</Text>
                <TextInput value={String(f.to ?? '')} onChangeText={(v) => edit(i, { to: v })} onBlur={() => persist(floors)} keyboardType="number-pad" style={cell} /></View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 9, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 12, color: units.length ? '#374151' : COLORS.error, flex: 1 }}>
                {units.length
                  ? `${units.length} unit${units.length === 1 ? '' : 's'}: ${units.slice(0, 3).join(', ')}${units.length > 3 ? ` … ${units[units.length - 1]}` : ''}`
                  : 'Set From / To to generate unit numbers.'}
                {units.length && isNew === 0 ? '  · all exist' : ''}
              </Text>
              {!industrial && (
                <TouchableOpacity onPress={() => askRepeat(i)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7, borderWidth: 1.5, borderColor: COLORS.border }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: BLUE }}>↓ Repeat up to…</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 9 }}>
              {uploading === i ? <ActivityIndicator size="small" color={BLUE} />
                : f.image_url ? (
                  <>
                    <Image source={{ uri: f.image_url }} style={{ width: 66, height: 48, borderRadius: 8, backgroundColor: COLORS.surfaceAlt }} />
                    <TouchableOpacity onPress={() => commit(floors.map((x, ix) => (ix === i ? { ...x, image_url: '' } : x)))}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.error }}>Remove plan</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity onPress={() => uploadPlan(i)} style={{ flex: 1, borderWidth: 1.5, borderStyle: 'dashed', borderColor: COLORS.border, borderRadius: 9, paddingVertical: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: MUTED, fontWeight: '600' }}>Upload {f.label || 'floor'} plan</Text>
                  </TouchableOpacity>
                )}
            </View>
          </View>
        );
      })}
      </View>
        );
      })}

      {planned.length > 0 && (
        <View style={{ borderTopWidth: 1, borderTopColor: COLORS.surfaceAlt, marginTop: 14, paddingTop: 12 }}>
          <Text style={{ fontSize: 13, color: '#374151', marginBottom: 10 }}>
            <Text style={{ fontWeight: '800' }}>{planned.length}</Text> units planned across{' '}
            <Text style={{ fontWeight: '800' }}>{industrial ? blocksOf(floors).filter(Boolean).length : floors.length}</Text> {industrial ? `block${blocksOf(floors).filter(Boolean).length === 1 ? '' : 's'}` : 'floors'} ·{' '}
            <Text style={{ fontWeight: '800', color: toCreate.length ? '#B45309' : COLORS.success }}>
              {toCreate.length ? `${toCreate.length} to create` : 'all already created'}
            </Text>
            {dupes > 0 ? <Text style={{ fontWeight: '800', color: COLORS.error }}>{`  · ${dupes} duplicate number${dupes === 1 ? '' : 's'}`}</Text> : null}
          </Text>
          {note ? <Text style={{ fontSize: 11, color: MUTED, marginBottom: 10 }}>{note}</Text> : null}
          {onGenerate ? (
            <TouchableOpacity onPress={() => onGenerate(toCreate)} disabled={generating || !toCreate.length}
              style={{ backgroundColor: toCreate.length && !generating ? NAVY : '#C7D2FE', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}>
              {generating ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{`Generate ${toCreate.length} Units`}</Text>}
            </TouchableOpacity>
          ) : null}
        </View>
      )}
      {!!msg && <Text style={{ marginTop: 10, fontSize: 12, fontWeight: '600', color: msg[0] === '\u2705' ? COLORS.success : COLORS.error }}>{msg}</Text>}
    </View>
  );
}

