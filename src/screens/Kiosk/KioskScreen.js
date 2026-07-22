import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator, StyleSheet } from 'react-native';
import Svg, { Rect, Polygon, Text as SvgText } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { apiFetch } from '../../utils/apiFetch';
import { SALES_ENDPOINTS } from '../../constants/api';
import { logout } from '../../redux/actions/authActions';

// Client-facing full-screen Kiosk self-booking (mirrors the web /kiosk flow).
// Kiosk-role device is logged in; walk-in client self-serves:
//   project (kiosk-enabled) -> plot(s) on interactive map (or EOI if no plots) -> booking form.
const NAVY = '#182350', BLUE = '#3D5AFE', BLUEBG = '#E8EEFF', MUTED = '#8492A6', GREEN = '#16A34A';
const STEPS = [{ key: 'project', label: 'Project' }, { key: 'select', label: 'Unit' }, { key: 'details', label: 'Details' }];
const KSTATUS = {
  available: { label: 'Available', dot: '#16A34A', bg: '#DCFCE7' },
  hold:      { label: 'On Hold',   dot: '#F59E0B', bg: '#FEF3C7' },
  sold:      { label: 'Sold',      dot: '#EF4444', bg: '#FEE2E2' },
};
const isImageUrl = (u) => !!u && /\.(png|jpe?g|webp|gif|svg|avif)(\?|$)/i.test(u);
const zoneCenter = (z) => (z.points?.length
  ? { cx: z.points.reduce((s, p) => s + p.x, 0) / z.points.length, cy: z.points.reduce((s, p) => s + p.y, 0) / z.points.length }
  : { cx: (z.x || 0) + (z.width || 0) / 2, cy: (z.y || 0) + (z.height || 0) / 2 });

export default function KioskScreen({ navigation }) {
  const dispatch = useDispatch();
  const user     = useSelector((s) => s.auth.user);

  const [step, setStep]         = useState('project');
  const [projects, setProjects] = useState(null);
  const [project,  setProject]  = useState(null);
  const [plots,    setPlots]    = useState([]);   // ALL plots (map needs sold/hold too)
  const [selIds,   setSelIds]   = useState([]);   // chosen plot ids (multi-select for LOI)
  const [eoiType,  setEoiType]  = useState('');
  const [eoiUnits, setEoiUnits] = useState('1');

  const isEoi = project && plots.length === 0;
  const isSelected = (pl) => selIds.includes(pl.id);
  const togglePlot = (pl) => { if (!pl || pl.status !== 'available') return; setSelIds((s) => s.includes(pl.id) ? s.filter((x) => x !== pl.id) : [...s, pl.id]); };

  useEffect(() => {
    apiFetch(SALES_ENDPOINTS.projects)
      .then((r) => r.ok ? r.json() : [])
      .then((arr) => setProjects((Array.isArray(arr) ? arr : []).filter((p) => p.kiosk_enabled && p.is_active)))
      .catch(() => setProjects([]));
  }, []);

  // Reset to the project picker whenever the kiosk regains focus (e.g. after a booking),
  // so the next walk-in client starts fresh.
  useEffect(() => navigation.addListener('focus', () => {
    setProject(null); setPlots([]); setSelIds([]); setEoiType(''); setEoiUnits('1'); setStep('project');
  }), [navigation]);

  const pickProject = async (p) => {
    setProject(p); setSelIds([]); setEoiType(''); setEoiUnits('1');
    try {
      const r = await apiFetch(`${SALES_ENDPOINTS.plots}?project=${p.id}`);
      const arr = r.ok ? await r.json() : [];
      setPlots(Array.isArray(arr) ? arr : []);
    } catch { setPlots([]); }
    setStep('select');
  };

  const availablePlots = plots.filter((x) => x.status === 'available');
  const plotByNumber   = {}; plots.forEach((p) => { plotByNumber[String(p.number)] = p; });
  const zones          = project?.site_map_zones || [];
  const mapImage       = project?.site_map_image_url || (isImageUrl(project?.master_plan_url) ? project?.master_plan_url : '');
  const hasMap         = !!mapImage && zones.length > 0;

  const unitTypes = project?.eoi_unit_types || [];
  const selType   = unitTypes.find((t) => t.type === eoiType);
  const nUnits    = Math.max(1, parseInt(eoiUnits, 10) || 1);
  const eoiArea   = selType ? (+selType.plot_area || 0) * nUnits : 0;
  const eoiConst  = selType ? (+selType.const_area || 0) * nUnits : 0;
  const canContinueSelect = isEoi ? (unitTypes.length === 0 || !!eoiType) : selIds.length > 0;

  // Open the real booking/LOI form for this project (client self-fills). Returns to Kiosk after submit.
  const openBookingForm = () => {
    navigation.navigate('BookingForm', {
      project: project.id,
      ...(isEoi ? { eoi: '1' } : { plots: selIds.join(',') }),
      projectName: project.name, formulaSet: project.formula_set, kiosk: '1',
    });
  };

  const restart = () => {
    setProject(null); setPlots([]); setSelIds([]); setEoiType(''); setEoiUnits('1'); setStep('project');
  };

  const stepIdx = STEPS.findIndex((s) => s.key === step);

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={s.logo}><Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>V</Text></View>
          <View>
            <Text style={s.brand}>Vistara Realty</Text>
            <Text style={s.brandSub}>Self-Service Booking Kiosk</Text>
          </View>
        </View>
        {step !== 'done' && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {STEPS.map((st, i) => (
              <View key={st.key} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[s.dot, i < stepIdx ? s.dotDone : i === stepIdx ? s.dotActive : null]}>
                  <Text style={[s.dotTxt, (i <= stepIdx) ? { color: '#fff' } : null]}>{i < stepIdx ? '✓' : i + 1}</Text>
                </View>
                {i < STEPS.length - 1 && <View style={s.stepBar} />}
              </View>
            ))}
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        {/* STEP project */}
        {step === 'project' && (
          <View>
            <Text style={s.hero}>Find your space.</Text>
            <Text style={s.heroSub}>Choose a project to begin your booking.</Text>
            {projects === null ? <ActivityIndicator color={BLUE} style={{ marginTop: 40 }} />
              : projects.length === 0 ? <Text style={s.empty}>No projects are open for kiosk booking right now. Please ask our staff.</Text>
              : projects.map((p) => (
                <TouchableOpacity key={p.id} style={s.card} activeOpacity={0.85} onPress={() => pickProject(p)}>
                  {p.cover_image_url
                    ? <Image source={{ uri: p.cover_image_url }} style={s.cardImg} />
                    : <View style={[s.cardImg, { backgroundColor: BLUEBG }]} />}
                  <View style={{ padding: 16 }}>
                    <Text style={s.cardTitle}>{p.name}</Text>
                    {!!p.location && <Text style={s.cardLoc}>📍 {p.location}</Text>}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                      {!!p.price_range && <Text style={s.tag}>{p.price_range}</Text>}
                      {!!p.total_area && <Text style={[s.tag, s.tagGhost]}>{p.total_area}</Text>}
                    </View>
                    <Text style={s.cardCta}>Book now →</Text>
                  </View>
                </TouchableOpacity>
              ))}
          </View>
        )}

        {/* STEP select */}
        {step === 'select' && project && (
          <View>
            <TouchableOpacity onPress={restart}><Text style={s.back}>← Projects</Text></TouchableOpacity>
            <Text style={s.h1}>{project.name}</Text>
            {/* Master plan only when there's no interactive map (avoid showing twice) */}
            {!hasMap && !!project.master_plan_url && <Image source={{ uri: project.master_plan_url }} style={s.master} resizeMode="contain" />}

            {isEoi ? (
              <View>
                <Text style={s.note}>Plots aren’t released yet — register your Expression of Interest and we’ll reserve your spot.</Text>
                {unitTypes.length > 0 && (
                  <>
                    <Text style={s.label}>CHOOSE A UNIT TYPE</Text>
                    <View style={s.chips}>
                      {unitTypes.map((t) => (
                        <TouchableOpacity key={t.type} onPress={() => setEoiType(t.type)} style={[s.chip, eoiType === t.type ? s.chipOn : null]}>
                          <Text style={[s.chipT, eoiType === t.type ? { color: BLUE } : null]}>{t.type}</Text>
                          <Text style={s.chipS}>{t.plot_area} sq.yd</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={s.label}>NUMBER OF UNITS</Text>
                    <View style={s.stepper}>
                      <TouchableOpacity style={s.stepBtn} onPress={() => setEoiUnits(String(Math.max(1, nUnits - 1)))}><Text style={s.stepBtnT}>−</Text></TouchableOpacity>
                      <TextInput style={s.stepInput} value={eoiUnits} onChangeText={setEoiUnits} keyboardType="numeric" />
                      <TouchableOpacity style={s.stepBtn} onPress={() => setEoiUnits(String(nUnits + 1))}><Text style={s.stepBtnT}>+</Text></TouchableOpacity>
                    </View>
                    {!!selType && <Text style={s.summary}>Total area {eoiArea} sq.yd{eoiConst ? ` · Construction ${eoiConst} sq.yd` : ''}</Text>}
                  </>
                )}
              </View>
            ) : hasMap ? (
              <View>
                <Text style={s.label}>TAP AVAILABLE (GREEN) UNITS — PICK ONE OR SEVERAL</Text>
                <View style={{ flexDirection: 'row', gap: 16, marginBottom: 10 }}>
                  {['available', 'hold', 'sold'].map((k) => (
                    <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: KSTATUS[k].dot }} />
                      <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED }}>{KSTATUS[k].label}</Text>
                    </View>
                  ))}
                </View>
                <View style={s.mapWrap}>
                  <Image source={{ uri: mapImage }} style={{ width: '100%', aspectRatio: 16 / 10 }} resizeMode="contain" />
                  <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
                    {zones.map((zone) => {
                      const pl = plotByNumber[String(zone.plotNumber)];
                      if (!pl) return null;
                      const cfg = KSTATUS[pl.status] || KSTATUS.available;
                      const isSel = isSelected(pl);
                      const { cx, cy } = zoneCenter(zone);
                      const label = String(zone.plotNumber).replace(/^[^\d]+/, '') || String(zone.plotNumber);
                      const press = () => togglePlot(pl);
                      const fillC = isSel ? '#3D5AFE' : cfg.dot + '99';
                      const strokeC = isSel ? '#1A237E' : cfg.dot;
                      const sw = isSel ? '0.9' : '0.5';
                      return (
                        <React.Fragment key={zone.id}>
                          {zone.points?.length
                            ? <Polygon points={zone.points.map((p) => `${p.x},${p.y}`).join(' ')} fill={fillC} stroke={strokeC} strokeWidth={sw} onPress={press} />
                            : <Rect x={zone.x} y={zone.y} width={zone.width} height={zone.height} rx="0.4" fill={fillC} stroke={strokeC} strokeWidth={sw} onPress={press} />}
                          <SvgText x={cx} y={cy} textAnchor="middle" fontSize="2.6" fontWeight="bold" fill="#fff" onPress={press}>{isSel ? `✓${label}` : label}</SvgText>
                        </React.Fragment>
                      );
                    })}
                  </Svg>
                </View>
                {selIds.length > 0 && <Text style={s.summary}>Selected {selIds.length} unit{selIds.length > 1 ? 's' : ''} · {plots.filter((p) => selIds.includes(p.id)).map((p) => p.number).join(', ')}</Text>}
              </View>
            ) : (
              <View>
                <Text style={s.label}>CHOOSE AVAILABLE PLOTS — PICK ONE OR SEVERAL</Text>
                <View style={s.chips}>
                  {availablePlots.map((pl) => (
                    <TouchableOpacity key={pl.id} onPress={() => togglePlot(pl)} style={[s.plot, isSelected(pl) ? s.chipOn : null]}>
                      <Text style={[s.plotNo, isSelected(pl) ? { color: BLUE } : null]}>{isSelected(pl) ? `✓ ${pl.number}` : pl.number}</Text>
                      {!!pl.size && <Text style={s.chipS}>{pl.size} sq.yd</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <TouchableOpacity disabled={!canContinueSelect} onPress={openBookingForm} style={[s.primary, !canContinueSelect ? { opacity: 0.45 } : null]}>
              <Text style={s.primaryT}>Continue →</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* Staff exit */}
      <TouchableOpacity style={s.exit} onPress={() => dispatch(logout())}><Text style={s.exitT}>Exit kiosk</Text></TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F7FF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EDEFF5' },
  logo: { width: 42, height: 42, borderRadius: 12, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 17, fontWeight: '800', color: NAVY },
  brandSub: { fontSize: 11, color: MUTED },
  dot: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#E4E8F2', alignItems: 'center', justifyContent: 'center' },
  dotActive: { backgroundColor: BLUE }, dotDone: { backgroundColor: GREEN },
  dotTxt: { fontSize: 11, fontWeight: '800', color: '#9AA4B8' },
  stepBar: { width: 18, height: 2, backgroundColor: '#E1E6F1', marginHorizontal: 6 },

  hero: { fontSize: 30, fontWeight: '800', color: NAVY, letterSpacing: -0.5 },
  heroSub: { fontSize: 15, color: '#6B7391', marginTop: 4, marginBottom: 20 },
  h1: { fontSize: 22, fontWeight: '800', color: NAVY, marginBottom: 12, marginTop: 6 },

  card: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', marginBottom: 18, shadowColor: NAVY, shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  cardImg: { width: '100%', height: 180 },
  cardTitle: { fontSize: 20, fontWeight: '800', color: NAVY },
  cardLoc: { fontSize: 13, color: MUTED, marginTop: 3 },
  tag: { fontSize: 12, fontWeight: '700', color: BLUE, backgroundColor: BLUEBG, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, overflow: 'hidden' },
  tagGhost: { color: '#64748B', backgroundColor: '#F1F4FA' },
  cardCta: { fontSize: 14, fontWeight: '800', color: BLUE, marginTop: 12 },

  back: { color: '#6B7391', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  master: { width: '100%', height: 220, backgroundColor: '#F5F7FC', borderRadius: 14, marginBottom: 18 },
  mapWrap: { width: '100%', borderRadius: 14, overflow: 'hidden', backgroundColor: '#F5F7FC', borderWidth: 1, borderColor: '#E6EBF4' },
  note: { fontSize: 15, color: '#4B5468', lineHeight: 22, marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4, color: MUTED, marginTop: 16, marginBottom: 8 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { minWidth: 92, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: '#E1E6F1', backgroundColor: '#fff' },
  chipOn: { borderColor: BLUE, backgroundColor: BLUEBG },
  chipT: { fontSize: 15, fontWeight: '800', color: '#374151' },
  chipS: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  plot: { minWidth: 88, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: '#E1E6F1', backgroundColor: '#fff' },
  plotNo: { fontSize: 16, fontWeight: '800', color: '#374151' },

  stepper: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderWidth: 1.5, borderColor: '#E1E6F1', borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff' },
  stepBtn: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6F8FD' },
  stepBtnT: { fontSize: 22, fontWeight: '700', color: BLUE },
  stepInput: { width: 72, height: 50, textAlign: 'center', fontSize: 17, fontWeight: '700', color: NAVY },
  summary: { marginTop: 14, fontSize: 15, color: '#4B5468' },

  input: { height: 52, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#D9DEEA', fontSize: 16, backgroundColor: '#fff', color: NAVY },
  primary: { height: 54, borderRadius: 14, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', marginTop: 26 },
  primaryT: { color: '#fff', fontSize: 16, fontWeight: '800' },
  fine: { fontSize: 12, color: '#9AA4B8', marginTop: 12, textAlign: 'center' },
  err: { marginTop: 14, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 10, padding: 12, fontSize: 14, color: '#DC2626' },

  check: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  doneMsg: { fontSize: 16, color: '#3B4256', textAlign: 'center', marginTop: 8 },
  empty: { backgroundColor: '#fff', borderRadius: 16, padding: 30, textAlign: 'center', color: '#6B7391', fontSize: 15, marginTop: 10 },
  exit: { position: 'absolute', bottom: 10, right: 14 },
  exitT: { fontSize: 11, color: '#AEB6C7' },
});
