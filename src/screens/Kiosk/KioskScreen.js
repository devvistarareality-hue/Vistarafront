import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { apiFetch } from '../../utils/apiFetch';
import { SALES_ENDPOINTS } from '../../constants/api';
import { logout } from '../../redux/actions/authActions';

// Client-facing full-screen Kiosk self-booking (mirrors the web /kiosk flow).
// Kiosk-role device is logged in; walk-in client self-serves:
//   project (kiosk-enabled) -> plot (or EOI if no plots) -> details -> submit (PENDING approval).
const NAVY = '#182350', BLUE = '#3D5AFE', BLUEBG = '#E8EEFF', MUTED = '#8492A6', GREEN = '#16A34A';
const STEPS = [{ key: 'project', label: 'Project' }, { key: 'select', label: 'Unit' }, { key: 'details', label: 'Details' }];

export default function KioskScreen() {
  const dispatch = useDispatch();
  const user     = useSelector((s) => s.auth.user);

  const [step, setStep]         = useState('project');
  const [projects, setProjects] = useState(null);
  const [project,  setProject]  = useState(null);
  const [plots,    setPlots]    = useState([]);
  const [plot,     setPlot]     = useState(null);
  const [eoiType,  setEoiType]  = useState('');
  const [eoiUnits, setEoiUnits] = useState('1');
  const [form, setForm]         = useState({ client_name: '', gender: '', phone: '', address: '' });
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState('');
  const [ref, setRef]           = useState('');

  const isEoi = project && plots.length === 0;

  useEffect(() => {
    apiFetch(SALES_ENDPOINTS.projects)
      .then((r) => r.ok ? r.json() : [])
      .then((arr) => setProjects((Array.isArray(arr) ? arr : []).filter((p) => p.kiosk_enabled && p.is_active)))
      .catch(() => setProjects([]));
  }, []);

  const pickProject = async (p) => {
    setProject(p); setPlot(null); setEoiType(''); setEoiUnits('1'); setErr('');
    try {
      const r = await apiFetch(`${SALES_ENDPOINTS.plots}?project=${p.id}`);
      const arr = r.ok ? await r.json() : [];
      setPlots((Array.isArray(arr) ? arr : []).filter((x) => x.status === 'available'));
    } catch { setPlots([]); }
    setStep('select');
  };

  const unitTypes = project?.eoi_unit_types || [];
  const selType   = unitTypes.find((t) => t.type === eoiType);
  const nUnits    = Math.max(1, parseInt(eoiUnits, 10) || 1);
  const eoiArea   = selType ? (+selType.plot_area || 0) * nUnits : 0;
  const eoiConst  = selType ? (+selType.const_area || 0) * nUnits : 0;
  const canContinueSelect = isEoi ? (unitTypes.length === 0 || !!eoiType) : !!plot;

  const submit = async () => {
    if (!form.client_name.trim() || !form.phone.trim() || !form.gender) { setErr('Please enter your name, gender and phone.'); return; }
    setSaving(true); setErr('');
    const area      = isEoi ? String(eoiArea || '') : String(plot?.size || '');
    const constArea = isEoi ? String(eoiConst || '') : String(plot?.construction_area || '0');
    const payload = {
      project: project.id, plot: isEoi ? undefined : plot.id, plot_ids: isEoi ? [] : [plot.id],
      ...(isEoi ? { eoi: true } : {}),
      client_name: form.client_name.trim(), gender: form.gender, phone: form.phone.trim(),
      address: form.address.trim(), source: 'Kiosk',
      formula_set: project.formula_set || 'kalrav',
      area, area_unit: 'sq.yd', const_area: constArea || '0', sale_deed_pct: 60,
    };
    try {
      const r = await apiFetch(SALES_ENDPOINTS.bookings, { method: 'POST', body: JSON.stringify(payload) });
      const data = await r.json();
      if (!r.ok) { setErr(data.detail || 'Could not submit. Please call staff.'); setSaving(false); return; }
      setRef(data.plot_numbers || (isEoi ? 'EOI' : plot?.number) || '');
      setStep('done');
    } catch { setErr('Network error. Please call staff.'); }
    setSaving(false);
  };

  const restart = () => {
    setProject(null); setPlots([]); setPlot(null); setEoiType(''); setEoiUnits('1');
    setForm({ client_name: '', gender: '', phone: '', address: '' }); setErr(''); setRef(''); setStep('project');
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
            {!!project.master_plan_url && <Image source={{ uri: project.master_plan_url }} style={s.master} resizeMode="contain" />}

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
            ) : (
              <View>
                <Text style={s.label}>CHOOSE AN AVAILABLE PLOT</Text>
                <View style={s.chips}>
                  {plots.map((pl) => (
                    <TouchableOpacity key={pl.id} onPress={() => setPlot(pl)} style={[s.plot, plot?.id === pl.id ? s.chipOn : null]}>
                      <Text style={[s.plotNo, plot?.id === pl.id ? { color: BLUE } : null]}>{pl.number}</Text>
                      {!!pl.size && <Text style={s.chipS}>{pl.size} sq.yd</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <TouchableOpacity disabled={!canContinueSelect} onPress={() => setStep('details')} style={[s.primary, !canContinueSelect ? { opacity: 0.45 } : null]}>
              <Text style={s.primaryT}>Continue →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP details */}
        {step === 'details' && (
          <View>
            <TouchableOpacity onPress={() => setStep('select')}><Text style={s.back}>← Back</Text></TouchableOpacity>
            <Text style={s.h1}>Your details</Text>
            <Text style={s.note}>We’ll use these to confirm your {isEoi ? 'interest' : 'booking'}.</Text>

            <Text style={s.label}>FULL NAME *</Text>
            <TextInput style={s.input} value={form.client_name} onChangeText={(t) => setForm((f) => ({ ...f, client_name: t }))} placeholder="Your name" placeholderTextColor="#AEB6C7" />
            <Text style={s.label}>GENDER *</Text>
            <View style={s.chips}>
              {['Male', 'Female', 'Other'].map((g) => (
                <TouchableOpacity key={g} onPress={() => setForm((f) => ({ ...f, gender: g }))} style={[s.chip, form.gender === g ? s.chipOn : null]}>
                  <Text style={[s.chipT, form.gender === g ? { color: BLUE } : null]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={s.label}>PHONE *</Text>
            <TextInput style={s.input} value={form.phone} onChangeText={(t) => setForm((f) => ({ ...f, phone: t }))} placeholder="10-digit mobile" keyboardType="phone-pad" placeholderTextColor="#AEB6C7" />
            <Text style={s.label}>CITY / ADDRESS</Text>
            <TextInput style={s.input} value={form.address} onChangeText={(t) => setForm((f) => ({ ...f, address: t }))} placeholder="Optional" placeholderTextColor="#AEB6C7" />

            {!!err && <Text style={s.err}>{err}</Text>}
            <TouchableOpacity disabled={saving} onPress={submit} style={[s.primary, saving ? { opacity: 0.6 } : null]}>
              <Text style={s.primaryT}>{saving ? 'Submitting…' : 'Submit booking'}</Text>
            </TouchableOpacity>
            <Text style={s.fine}>Your request will be reviewed and confirmed by our team.</Text>
          </View>
        )}

        {/* STEP done */}
        {step === 'done' && (
          <View style={{ alignItems: 'center', paddingTop: 30 }}>
            <View style={s.check}><Text style={{ fontSize: 42, color: GREEN }}>✓</Text></View>
            <Text style={s.h1}>Thank you, {form.client_name.split(' ')[0]}!</Text>
            <Text style={s.doneMsg}>Your {isEoi ? 'Expression of Interest' : 'booking'} for {project?.name}{ref ? ` · ${ref}` : ''} has been submitted.</Text>
            <Text style={[s.note, { textAlign: 'center' }]}>Our team will contact you shortly to confirm.</Text>
            <TouchableOpacity onPress={restart} style={[s.primary, { marginTop: 20, alignSelf: 'center', paddingHorizontal: 34 }]}><Text style={s.primaryT}>Start a new booking</Text></TouchableOpacity>
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
