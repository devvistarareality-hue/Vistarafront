import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StatusBar, ActivityIndicator, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../../utils/apiFetch';
import { SALES_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import { computeFormulas, fieldFlags, installmentBase, rupee } from '../../lib/bookingFormulas';
import { buildLOIHtml } from '../../lib/bookingLOIHtml';

const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary; const BLUE = COLORS.link;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 14, padding: 14, marginBottom: 12, ...CARD_SHADOW };
const safeDate = (s) => { const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(s || '')); return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : ''; };

export default function BookingFormScreen({ navigation, route }) {
  const me = useSelector((s) => s.auth.user);
  const companyId = useSelector((s) => s.adminFilter?.companyId);
  const cq = (sep) => (companyId ? `${sep}company_id=${companyId}` : '');
  const p = route?.params || {};
  const reviseId = p.revise || '';
  const [projectId, setProjectId] = useState(p.project ? String(p.project) : '');
  // Multi-plot: `plots` route param is a comma list of ids; fall back to single `plot`.
  const [plotIds, setPlotIds] = useState((p.plots ? String(p.plots) : (p.plot ? String(p.plot) : '')).split(',').map((s) => s.trim()).filter(Boolean));
  const plotId = plotIds[0] || '';
  const leadId = p.lead || '';

  const [project, setProject] = useState(p.formulaSet ? { name: p.projectName, formula_set: p.formulaSet } : null);
  const [plotNo, setPlotNo] = useState(p.plotNumber || '');
  const [sources, setSources] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [insts, setInsts] = useState([]);
  const [nsdInsts, setNsdInsts] = useState([]);
  const [extraDate, setExtraDate] = useState('');
  const [ew, setEw] = useState({ desc: '', amt: '' });
  const [ewInsts, setEwInsts] = useState([]);
  const [extraTerms, setExtraTerms] = useState([]); // [{title,desc}] — appended below default LOI terms
  const addTerm    = () => setExtraTerms((s) => [...s, { title: '', desc: '' }]);
  const setTerm    = (i, k, val) => setExtraTerms((s) => s.map((t, j) => (j === i ? { ...t, [k]: val } : t)));
  const removeTerm = (i) => setExtraTerms((s) => s.filter((_, j) => j !== i));
  const cleanTerms = () => extraTerms.map((t) => ({ title: (t.title || '').trim(), desc: (t.desc || '').trim() })).filter((t) => t.title || t.desc);
  const [loiFile, setLoiFile] = useState(null);

  const [f, setF] = useState({
    client_name: p.client || '', gender: '', phone: p.phone || '', address: '', source: '',
    area: '', area_unit: 'sq.yd', const_area: '', villa_type: '',
    land_rate: '', dev_rate: '', const_rate: '', sale_deed_rate: '', dev_agreement_rate: '',
    sale_deed_pct: '60',
    land_sale_deed: '', const_agreement: '', premium_location: '',
    discount: '0', legal_charges: '', maint_rate: '', maint_months: '',
    apply_reg_fee: 'Yes', apply_page_fee: 'Yes', apply_stamp_duty: 'Yes', apply_gst: 'Yes',
    booking_date: new Date().toISOString().slice(0, 10), cp_name: '',
  });
  const [errs, setErrs] = useState({});   // required-field highlight on Generate/Submit
  const set = (k, v) => { setF((s) => ({ ...s, [k]: v })); setErrs((e) => (e[k] ? { ...e, [k]: false } : e)); };
  const [deedAmtStr, setDeedAmtStr] = useState('');
  const editingAmtRef = useRef(false);

  useEffect(() => {
    if (projectId) apiFetch(SALES_ENDPOINTS.project(projectId) + cq('?')).then(r => r.json()).then((pr) => {
      setProject(pr); setF((s) => ({ ...s, area_unit: pr.formula_set === 'kalrav' ? 'sq.yd' : 'sq.ft' }));
    }).catch(() => {});
    if (projectId) apiFetch(`${SALES_ENDPOINTS.plots}?project=${projectId}${cq('&')}`).then(r => r.json()).then((arr) => {
      const all = Array.isArray(arr) ? arr : [];
      // Resolve every selected plot (preserve order) and sum their areas.
      const picked = plotIds.map((pid) => all.find((x) => String(x.id) === String(pid))).filter(Boolean);
      if (picked.length) {
        setPlotNo(picked.map((x) => x.number).join(', '));
        const sumArea = picked.reduce((a, x) => a + (parseFloat((x.size || '').replace(/[^\d.]/g, '')) || 0), 0);
        // Auto-map construction area from the plot definition(s) into the booking.
        const sumConst = picked.reduce((a, x) => a + (parseFloat((x.construction_area || '').replace(/[^\d.]/g, '')) || 0), 0);
        setF((s) => ({
          ...s,
          area: sumArea ? String(+sumArea.toFixed(2)) : s.area,
          const_area: sumConst ? String(+sumConst.toFixed(2)) : s.const_area,
        }));
      }
    }).catch(() => {});
    apiFetch(SALES_ENDPOINTS.sources + cq('?')).then(r => r.json()).then((d) => setSources(Array.isArray(d) ? d : [])).catch(() => {});
  }, [projectId, plotIds.join(','), companyId]);

  // Revision prefill
  useEffect(() => {
    if (!reviseId) return;
    apiFetch(SALES_ENDPOINTS.bookings + cq('?')).then(r => r.json()).then((arr) => {
      const b = (Array.isArray(arr) ? arr : []).find((x) => String(x.id) === String(reviseId));
      if (!b) return;
      setProjectId(String(b.project));
      setPlotIds(((b.plot_ids && b.plot_ids.length ? b.plot_ids : [b.plot]).filter(Boolean)).map(String));
      setF((s) => ({ ...s, client_name: b.client_name || '', gender: b.gender || '', phone: b.phone || '', address: b.address || '', source: b.source || '',
        area: b.area || '', area_unit: b.area_unit || 'sq.yd', const_area: b.const_area || '', villa_type: b.villa_type || '',
        land_rate: String(b.land_rate), dev_rate: String(b.dev_rate), const_rate: String(b.const_rate), sale_deed_rate: String(b.sale_deed_rate), dev_agreement_rate: String(b.dev_agreement_rate),
        sale_deed_pct: b.sale_deed_pct != null ? String(b.sale_deed_pct) : '60',
        land_sale_deed: String(b.land_sale_deed), const_agreement: String(b.const_agreement), premium_location: String(b.premium_location),
        discount: String(b.discount), legal_charges: String(b.legal_charges), maint_rate: String(b.maint_rate), maint_months: String(b.maint_months),
        apply_reg_fee: b.apply_reg_fee || 'Yes', apply_page_fee: b.apply_page_fee || 'Yes', apply_stamp_duty: b.apply_stamp_duty || 'Yes', apply_gst: b.apply_gst || 'Yes',
        booking_date: safeDate(b.booking_date) || s.booking_date, cp_name: b.cp_name || '' }));
      if (Array.isArray(b.installments)) {
        setInsts(b.installments.filter((i) => !i.isExtra && !i.isExtraWork && !i.isNsd).map((i) => ({ date: safeDate(i.date), pct: String(i.pct || ''), amt: String(i.amt || '') })));
        setNsdInsts(b.installments.filter((i) => i.isNsd).map((i) => ({ date: safeDate(i.date), pct: String(i.pct || ''), amt: String(i.amt || '') })));
        const ex = b.installments.find((i) => i.isExtra);
        if (ex) setExtraDate(safeDate(ex.date));
      }
      setEw({ desc: b.extra_work_desc || '', amt: b.extra_work_amount ? String(b.extra_work_amount) : '' });
      if (Array.isArray(b.extra_work_inst)) setEwInsts(b.extra_work_inst.map((i) => ({ date: safeDate(i.date), pct: String(i.pct || ''), amt: String(i.amt || '') })));
      if (Array.isArray(b.extra_terms)) setExtraTerms(b.extra_terms.map((t) => ({ title: t.title || '', desc: t.desc || '' })));
    }).catch(() => {});
  }, [reviseId]);

  const formulaSet = project?.formula_set || 'kalrav';
  const flags = useMemo(() => fieldFlags(formulaSet), [formulaSet]);
  const v = useMemo(() => computeFormulas({
    formulaSet, projectName: project?.name,
    area: f.area, landRate: f.land_rate, devRate: f.dev_rate, constArea: f.const_area, constRate: f.const_rate,
    discount: f.discount, legalCharges: f.legal_charges, maintRate: f.maint_rate, maintMonths: f.maint_months,
    gender: f.gender, landSaleDeed: f.land_sale_deed, constAgreement: f.const_agreement,
    premiumLocation: f.premium_location, saleDeedRate: f.sale_deed_rate, devAgreementRate: f.dev_agreement_rate,
    saleDeedPct: f.sale_deed_pct,
    applyRegFee: f.apply_reg_fee, applyPageFee: f.apply_page_fee, applyStampDuty: f.apply_stamp_duty, applyGst: f.apply_gst,
    extraWorkAmt: reviseId ? ew.amt : 0, extraWorkDesc: ew.desc,
  }), [f, formulaSet, project, ew, reviseId]);
  useEffect(() => {
    if (!editingAmtRef.current) setDeedAmtStr(String(Math.round(v.saleDeed) || ''));
  }, [v.saleDeed]);
  const base = installmentBase(v);
  const pctTotal = insts.reduce((a, r) => a + (parseFloat(r.pct) || 0), 0);
  const ewBase = parseFloat(ew.amt) || 0;
  const ewPctTotal = ewInsts.reduce((a, r) => a + (parseFloat(r.pct) || 0), 0);
  // Area unit follows the STM's toggle (relabel only); defaults to the project's native unit.
  const unit = f.area_unit || flags.areaUnit;
  const inr = (n) => Number(n || 0).toLocaleString('en-IN');
  const extraSub = formulaSet === 'ankhol' ? 'Stamp + Reg + GST + Maint Dep + Maint Adv + Legal'
    : formulaSet === 'industrial' ? 'Stamp + Reg + GST + Maint Dep + Maint Adv + Legal'
    : 'Stamp + Reg + GST + Maintenance + Legal';
  const extraSub2 = formulaSet === 'ankhol'
    ? `${inr(v.stampDuty)} + ${inr(v.regFees)} + ${inr(v.gst)} + ${inr(v.maintDeposit)} + ${inr(v.maintAdvance)} + ${inr(v.legal)}`
    : formulaSet === 'industrial'
      ? `${inr(v.stampDuty)} + ${inr(v.regFees)} + ${inr(v.gst)} + ${inr(v.maintDeposit)} + ${inr(v.maintAdvance)} + ${inr(v.legal)}`
      : `${inr(v.stampDuty)} + ${inr(v.regFees)} + ${inr(v.gst)} + ${inr(v.maint)} + ${inr(v.legal)}`;
  const saleDeedSub = formulaSet === 'ankhol' ? `${v.saleDeedPct}% × Total Basic Amount` : 'Sale Deed Rate × Plot Area';
  const saleDeedSub2 = formulaSet === 'ankhol'
    ? `${v.saleDeedPct}% × ${inr(v.plotBasic + v.plotDev + v.constAmt + v.premiumLocation)}`
    : `${inr(v.saleDeedRate)} × ${inr(v.area)}`;
  const stampSub = (formulaSet === 'ankhol' && f.apply_stamp_duty === 'No') ? 'Not applicable'
    : (formulaSet === 'kalrav' ? '4.9% of Land Sale Deed' : '4.9% of Sale Deed');
  const pageFeeTxt = f.apply_page_fee === 'No' ? '' : ' + ₹1,500';
  const femPage = f.apply_page_fee === 'No' ? '₹0' : '₹1,500';
  const regSub = f.apply_reg_fee === 'No' ? 'Not applicable'
    : (formulaSet === 'ankhol' ? `1% of Sale Deed${pageFeeTxt}`
      : formulaSet === 'industrial' ? `Male: 1% Sale Deed${pageFeeTxt} | Female: ${femPage}`
      : `Male: 1% LSD${pageFeeTxt} | Female: ${femPage}`);
  const gstSub = (formulaSet === 'ankhol' && f.apply_gst === 'No') ? 'Not applicable'
    : (formulaSet === 'ankhol' ? '5% of Sale Deed'
      : formulaSet === 'industrial' ? (v.isTundav ? '18% of 67% of Sale Deed' : '18% of Development Agreement')
      : '18% of Construction Agreement');
  const maintSub = formulaSet === 'ankhol' ? 'Construction Area × Rate × Months'
    : formulaSet === 'industrial' ? 'Plot Area × Rate' : 'Plot Area × Rate × Months';
  function buildEw(n) { n = parseInt(n, 10) || 0; setEwInsts(Array.from({ length: n }, (_, i) => ewInsts[i] || { date: '', pct: '', amt: '' })); }
  function setEwInst(i, k, val) {
    setEwInsts((arr) => {
      const next = arr.map((r, idx) => {
        if (idx !== i) return r;
        const nr = { ...r, [k]: val };
        if (k === 'pct') nr.amt = val && ewBase ? String(Math.round(ewBase * parseFloat(val) / 100)) : '';
        return nr;
      });
      const last = next.length - 1;
      if (last > 0 && i < last) {
        const usedPct = next.slice(0, last).reduce((a, r) => a + (parseFloat(r.pct) || 0), 0);
        const remPct = parseFloat(Math.max(0, 100 - usedPct).toFixed(2));
        next[last] = { ...next[last], pct: String(remPct), amt: ewBase ? String(Math.round(ewBase * remPct / 100)) : '' };
      }
      return next;
    });
  }
  const ewArr = () => ewInsts.map((r, i) => ({ no: i + 1, date: r.date, pct: parseFloat(r.pct) || 0, amt: parseFloat(r.amt) || 0, isExtraWork: true }));

  function buildInsts(n) { n = parseInt(n, 10) || 0; setInsts(Array.from({ length: n }, (_, i) => insts[i] || { date: '', pct: '', amt: '' })); }
  function setInst(i, k, val) {
    setInsts((arr) => {
      const next = arr.map((r, idx) => {
        if (idx !== i) return r;
        const nr = { ...r, [k]: val };
        if (k === 'pct') nr.amt = val && base ? String(Math.round(base * parseFloat(val) / 100)) : '';
        return nr;
      });
      const last = next.length - 1;
      if (last > 0 && i < last) {
        const usedPct = next.slice(0, last).reduce((a, r) => a + (parseFloat(r.pct) || 0), 0);
        const remPct = parseFloat(Math.max(0, 100 - usedPct).toFixed(2));
        next[last] = { ...next[last], pct: String(remPct), amt: base ? String(Math.round(base * remPct / 100)) : '' };
      }
      return next;
    });
  }
  const nsdBase = Math.max(0, (v.nonSaleDeed || 0) - (v.discount || 0));
  const nsdPctTotal = nsdInsts.reduce((a, r) => a + (parseFloat(r.pct) || 0), 0);
  function buildNsdInsts(n) { n = parseInt(n, 10) || 0; setNsdInsts(Array.from({ length: n }, (_, i) => nsdInsts[i] || { date: '', pct: '', amt: '' })); }
  function setNsdInst(i, k, val) {
    setNsdInsts((arr) => {
      const next = arr.map((r, idx) => {
        if (idx !== i) return r;
        const nr = { ...r, [k]: val };
        if (k === 'pct') nr.amt = val && nsdBase ? String(Math.round(nsdBase * parseFloat(val) / 100)) : '';
        return nr;
      });
      const last = next.length - 1;
      if (last > 0 && i < last) {
        const usedPct = next.slice(0, last).reduce((a, r) => a + (parseFloat(r.pct) || 0), 0);
        const remPct = parseFloat(Math.max(0, 100 - usedPct).toFixed(2));
        next[last] = { ...next[last], pct: String(remPct), amt: nsdBase ? String(Math.round(nsdBase * remPct / 100)) : '' };
      }
      return next;
    });
  }
  function instArr() {
    const arr = insts.map((r, i) => ({ no: i + 1, date: r.date, pct: parseFloat(r.pct) || 0, amt: parseFloat(r.amt) || 0 }));
    nsdInsts.forEach((r, i) => arr.push({ no: i + 1, date: r.date, pct: parseFloat(r.pct) || 0, amt: parseFloat(r.amt) || 0, isNsd: true }));
    arr.push({ no: 'Extra', date: extraDate, amt: Math.round(v.totalExtra), isExtra: true });
    return arr;
  }

  async function genLoi() {
    {
      const e = {};
      if (!f.client_name.trim()) e.client_name = true;
      if (!f.phone.trim()) e.phone = true;
      if (!v.plotBasic) { if (!f.area) e.area = true; if (!f.land_rate) e.land_rate = true; }
      if (Object.keys(e).length) { setErrs(e); setMsg('Please fill the highlighted fields.'); return; }
      setErrs({});
    }
    const meta = {
      clientName: f.client_name, phoneNumber: f.phone, gender: f.gender, address: f.address,
      project: project?.name, plotNo: plotNo, bookingDate: f.booking_date,
      villaType: f.villa_type, bunglowType: flags.bunglowTypeFixed || '', cpName: f.cp_name, loggedInUser: me?.name, source: f.source,
      areaUnit: f.area_unit || flags.areaUnit,
    };
    try {
      const html = buildLOIHtml(meta, v, instArr(), { formulaSet, projectName: project?.name, projectLogoUrl: project?.logo_url, isRevision: !!reviseId, revNo: (reviseId ? 1 : 0), extraWorkInst: ewArr(), extraTerms: cleanTerms(), areaUnit: f.area_unit || flags.areaUnit });
      const { uri } = await Print.printToFileAsync({ html });
      // Name the file like the web LOI, then share (Save to Files/Downloads, WhatsApp, Print…).
      const name = `LOI_${project?.name || ''}_Plot${plotNo || ''}_${(f.client_name || '').trim().replace(/\s+/g, '_')}.pdf`;
      const dest = FileSystem.cacheDirectory + name;
      try { await FileSystem.deleteAsync(dest, { idempotent: true }); } catch (e) {}
      await FileSystem.copyAsync({ from: uri, to: dest });
      await downloadLoi(dest, name);
    } catch (e) { setMsg('LOI error: ' + e.message); }
  }

  // Save the generated PDF to the phone. On Android, write to a folder the user
  // picks once (e.g. Downloads) via the Storage Access Framework — silent after
  // that. iOS has no public Downloads folder, so use the share/Save-to-Files sheet.
  async function downloadLoi(srcUri, name) {
    if (Platform.OS === 'android') {
      try {
        const SAF = FileSystem.StorageAccessFramework;
        let dirUri = await AsyncStorage.getItem('loi_download_dir');
        if (!dirUri) {
          const perm = await SAF.requestDirectoryPermissionsAsync();
          if (perm.granted) { dirUri = perm.directoryUri; await AsyncStorage.setItem('loi_download_dir', dirUri); }
        }
        if (dirUri) {
          const b64 = await FileSystem.readAsStringAsync(srcUri, { encoding: FileSystem.EncodingType.Base64 });
          const fileUri = await SAF.createFileAsync(dirUri, name.replace(/\.pdf$/i, ''), 'application/pdf');
          await FileSystem.writeAsStringAsync(fileUri, b64, { encoding: FileSystem.EncodingType.Base64 });
          setMsg('✅ LOI downloaded to your phone.');
          Alert.alert('LOI downloaded ✅', 'Saved to your phone. Open it now?', [
            { text: 'Later', style: 'cancel' },
            { text: 'Open', onPress: async () => { try { if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(srcUri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: name }); } catch (e) {} } },
          ]);
          return;
        }
      } catch (e) { await AsyncStorage.removeItem('loi_download_dir'); /* fall through to share */ }
    }
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(srcUri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: name });
    else await Print.printAsync({ uri: srcUri });
  }

  // Capture the signed LOI as multiple photos (3+ pages), then merge them into a
  // single PDF that's attached and uploaded to Supabase on Submit.
  async function captureLoi() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert('Camera access needed', 'Allow camera access to capture the signed LOI.'); return; }
    capturePage([]);
  }
  async function capturePage(pages) {
    try {
      const res = await ImagePicker.launchCameraAsync({ quality: 0.6, base64: true });
      if (res.canceled || !res.assets?.[0]?.base64) { if (pages.length) finishCapture(pages); return; }
      const imgs = [...pages, res.assets[0].base64];
      Alert.alert(`Page ${imgs.length} captured`, 'Capture another page or finish?', [
        { text: 'Finish', onPress: () => finishCapture(imgs) },
        { text: 'Capture next page', onPress: () => capturePage(imgs) },
      ]);
    } catch (e) { setMsg('Capture failed: ' + e.message); }
  }
  async function finishCapture(imgs) {
    if (!imgs.length) return;
    try {
      setMsg('Building PDF…');
      // One image per page: a full-page flex box centers each photo and scales it to
      // fit (object-fit:contain), so tall photos don't overflow onto a second page.
      const html = `<html><head><meta charset="utf-8"><style>
        @page { margin: 0; }
        html, body { margin: 0; padding: 0; }
        .pg { width: 100%; height: 100vh; display: flex; align-items: center; justify-content: center; overflow: hidden; page-break-after: always; }
        .pg:last-child { page-break-after: auto; }
        .pg img { max-width: 100%; max-height: 100%; object-fit: contain; }
      </style></head><body>${imgs.map(b =>
        `<div class="pg"><img src="data:image/jpeg;base64,${b}"/></div>`).join('')}</body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      const data = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const name = `LOI_signed_${(f.client_name || '').trim().replace(/\s+/g, '_') || 'capture'}.pdf`;
      setLoiFile({ name, type: 'application/pdf', data });
      setMsg(`📎 Captured ${imgs.length} page(s) → attached as PDF`);
    } catch (e) { setMsg('PDF build failed: ' + e.message); }
  }

  async function pickLoi() {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return;
      const a = res.assets[0];
      const data = await FileSystem.readAsStringAsync(a.uri, { encoding: FileSystem.EncodingType.Base64 });
      setLoiFile({ name: a.name || 'signed_loi.pdf', type: a.mimeType || 'application/pdf', data });
      setMsg('📎 Attached ' + (a.name || 'file'));
    } catch (e) { setMsg('Attach failed: ' + e.message); }
  }

  async function submit() {
    {
      const e = {};
      if (!f.client_name.trim()) e.client_name = true;
      if (!f.phone.trim()) e.phone = true;
      if (!f.land_rate || !v.plotBasic) { e.land_rate = true; if (!f.area) e.area = true; }
      if (Object.keys(e).length) { setErrs(e); setMsg('Please fill the highlighted fields.'); return; }
      setErrs({});
    }
    if (insts.length && Math.abs(pctTotal - 100) > 0.01) { setMsg('Installments must total 100%.'); return; }
    if (!loiFile) { setMsg('Generate the LOI, get it signed, and attach it before submitting.'); return; }
    setSaving(true); setMsg('');
    const payload = {
      project: projectId, plot: plotId, plot_ids: plotIds, lead: leadId || undefined,
      client_name: f.client_name.trim(), gender: f.gender, phone: f.phone.trim(), address: f.address, source: f.source,
      formula_set: formulaSet, area: f.area, area_unit: f.area_unit, const_area: f.const_area || '0',
      villa_type: flags.bunglowTypeIsDropdown ? f.villa_type : '', bunglow_type: flags.bunglowTypeFixed || '',
      land_rate: f.land_rate || 0, dev_rate: f.dev_rate || 0, const_rate: f.const_rate || 0,
      sale_deed_rate: f.sale_deed_rate || 0, dev_agreement_rate: f.dev_agreement_rate || 0,
      sale_deed_pct: f.sale_deed_pct === '' || f.sale_deed_pct == null ? 60 : f.sale_deed_pct,
      maint_rate: f.maint_rate || 0, maint_months: f.maint_months || 0,
      plot_basic: Math.round(v.plotBasic), plot_dev: Math.round(v.plotDev), const_amt: Math.round(v.constAmt),
      sale_deed: Math.round(v.saleDeed), dev_agreement: Math.round(v.devAgreement),
      land_sale_deed: f.land_sale_deed || 0, const_agreement: f.const_agreement || 0,
      stamp_duty: Math.round(v.stampDuty), reg_fees: Math.round(v.regFees), gst: Math.round(v.gst),
      maintenance: Math.round(v.maint), maint_deposit: Math.round(v.maintDeposit), maint_advance: Math.round(v.maintAdvance),
      legal_charges: f.legal_charges || 0, premium_location: f.premium_location || 0,
      total_extra: Math.round(v.totalExtra), discount: f.discount || 0, final_amount: Math.round(v.finalAmt),
      apply_reg_fee: f.apply_reg_fee, apply_page_fee: f.apply_page_fee, apply_stamp_duty: f.apply_stamp_duty, apply_gst: f.apply_gst,
      installments: instArr(), booking_date: f.booking_date, cp_name: f.cp_name,
      extra_work_desc: reviseId ? (ew.desc || '') : '',
      extra_work_amount: reviseId ? Math.round(parseFloat(ew.amt) || 0) : 0,
      extra_work_inst: reviseId ? ewArr() : [],
      extra_terms: cleanTerms(),
      loi_file: loiFile, ...(reviseId ? { revision_of: reviseId } : {}),
    };
    try {
      const res = await apiFetch(SALES_ENDPOINTS.bookings + cq('?'), { method: 'POST', body: JSON.stringify(payload) });
      if (res.ok) {
        Alert.alert('Booking submitted ✅', 'Your booking has been submitted and sent for approval.', [
          { text: 'OK', onPress: () => navigation.navigate('ClosureProjects') },
        ]);
      }
      else setMsg('Error: ' + JSON.stringify(await res.json().catch(() => ({}))));
    } catch (e) { setMsg(e.message); }
    setSaving(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.screenBg }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.screenBg, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: TEXT }}>{reviseId ? 'Revise Booking' : (plotIds.length > 1 ? 'Book Units' : 'Book Unit')} {plotNo}</Text>
          <Text style={{ fontSize: 12, color: MUTED }}>{project?.name || '…'} · {formulaSet.toUpperCase()}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Sec title="Client">
          <Fld l="Client Name *" val={f.client_name} on={(t) => set('client_name', t)} invalid={errs.client_name} />
          <Pick l="Gender *" val={f.gender} on={(x) => set('gender', x)} opts={['Male', 'Female']} />
          <Fld l="Phone *" val={f.phone} on={(t) => set('phone', t)} kb="phone-pad" invalid={errs.phone} />
          <Pick l="Source" val={f.source} on={(x) => set('source', x)} opts={sources.map((s) => s.name)} />
        </Sec>

        <Sec title="Plot & Type">
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4 }}>Area Unit</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {['sq.yd', 'sq.ft', 'sq.m'].map((u) => {
                const on2 = unit === u;
                return (
                  <TouchableOpacity key={u} onPress={() => set('area_unit', u)}
                    style={{ flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', borderColor: on2 ? BLUE : COLORS.border, backgroundColor: on2 ? BLUE : COLORS.white }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: on2 ? '#fff' : MUTED }}>{u}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <Fld l={`Plot Area (${unit})`} val={f.area} on={(t) => set('area', t)} kb="numeric" invalid={errs.area} />
          {flags.hasConstructionFields && <Fld l={`Construction Area (${unit})`} val={f.const_area} on={(t) => set('const_area', t)} kb="numeric" />}
          {flags.bunglowTypeIsDropdown && <Pick l="Villa Type" val={f.villa_type} on={(x) => set('villa_type', x)} opts={['1BHK', '2BHK', '3BHK', '4BHK', 'Customized Villa']} />}
        </Sec>

        <Sec title="Pricing">
          <Fld l={`Land Rate (₹/${unit}) *`} val={f.land_rate} on={(t) => set('land_rate', t)} kb="numeric" invalid={errs.land_rate} />
          {flags.hasConstructionFields && <Fld l={`Development Rate (₹/${unit})`} val={f.dev_rate} on={(t) => set('dev_rate', t)} kb="numeric" />}
          {flags.hasConstructionFields && <Fld l={`Construction Rate (₹/${unit})`} val={f.const_rate} on={(t) => set('const_rate', t)} kb="numeric" />}
          {flags.hasSaleDeedRate && <Fld l="Sale Deed Rate (₹/sq.ft)" val={f.sale_deed_rate} on={(t) => set('sale_deed_rate', t)} kb="numeric" />}
          {flags.hasDevAgreement && <Fld l="Dev Agreement Rate (₹/sq.ft)" val={f.dev_agreement_rate} on={(t) => set('dev_agreement_rate', t)} kb="numeric" />}
          {flags.hasLandSaleDeed && <Fld l="Land Sale Deed (₹)" val={f.land_sale_deed} on={(t) => set('land_sale_deed', t)} kb="numeric" />}
          {flags.hasConstructionAgreement && <Fld l="Construction Agreement (₹)" val={f.const_agreement} on={(t) => set('const_agreement', t)} kb="numeric" />}
          {flags.hasPremiumLocation && <Fld l="Premium Location (₹)" val={f.premium_location} on={(t) => set('premium_location', t)} kb="numeric" />}
          {formulaSet === 'ankhol' && (
            <>
              <Fld l="Sale Deed %" val={f.sale_deed_pct} on={(t) => set('sale_deed_pct', t)} kb="numeric" />
              <View style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4 }}>Unit Price (₹)</Text>
                <TextInput
                  value={deedAmtStr}
                  keyboardType="numeric"
                  onFocus={() => { editingAmtRef.current = true; }}
                  onBlur={() => { editingAmtRef.current = false; }}
                  onChangeText={(t) => {
                    setDeedAmtStr(t);
                    const amt = parseFloat(t) || 0;
                    const base = v.plotBasic + v.plotDev + v.constAmt + v.premiumLocation - v.discount;
                    if (base > 0) set('sale_deed_pct', String(amt / base * 100));
                  }}
                  style={inpS}
                />
              </View>
            </>
          )}
          {formulaSet !== 'ankhol' && <Fld l="Discount (₹)" val={f.discount} on={(t) => set('discount', t)} kb="numeric" />}
        </Sec>

        <Sec title="Legal & Other Charges">
          {formulaSet === 'ankhol' && <Pick l="Apply Stamp Duty?" val={f.apply_stamp_duty} on={(x) => set('apply_stamp_duty', x)} opts={['Yes', 'No']} />}
          <Calc l="Stamp Duty" sub={stampSub} val={v.stampDuty} />
          <Pick l="Apply Registration Fee?" val={f.apply_reg_fee} on={(x) => set('apply_reg_fee', x)} opts={['Yes', 'No']} />
          {f.apply_reg_fee !== 'No' && <Pick l="Apply ₹1,500 Page Fee?" val={f.apply_page_fee} on={(x) => set('apply_page_fee', x)} opts={['Yes', 'No']} />}
          <Calc l="Registration Fees" sub={regSub} val={v.regFees} />
          {formulaSet === 'ankhol' && <Pick l="Apply GST?" val={f.apply_gst} on={(x) => set('apply_gst', x)} opts={['Yes', 'No']} />}
          <Calc l="GST" sub={gstSub} val={v.gst} />
          <Fld l={`Maintenance Rate (₹/${unit}${formulaSet === 'industrial' ? '' : '/mo'})`} val={f.maint_rate} on={(t) => set('maint_rate', t)} kb="numeric" />
          {formulaSet !== 'industrial' && <Fld l="Maintenance Months" val={f.maint_months} on={(t) => set('maint_months', t)} kb="numeric" />}
          <Calc l="Maintenance Amount" sub={maintSub} val={v.maint} />
          {flags.hasMaintDeposit && <Calc l="Maintenance Deposit" sub="= Maintenance Amount" val={v.maintDeposit} />}
          {flags.hasMaintAdvance && <Calc l="Maintenance Advance" sub="= Maintenance Amount" val={v.maintAdvance} />}
          <Fld l="Legal Documentation charge (₹)" val={f.legal_charges} on={(t) => set('legal_charges', t)} kb="numeric" />
        </Sec>

        <View style={[CARD, { backgroundColor: '#EAF2FF' }]}>
          <Tot l="Plot Basic Amount" sub="Plot Area × Land Rate" sub2={`${inr(v.area)} × ${inr(v.landRate)}`} val={v.plotBasic} />
          {flags.hasConstructionFields && <Tot l="Plot Development Amount" sub={`${formulaSet === 'ankhol' ? 'Construction' : 'Plot'} Area × Dev Rate`} sub2={`${inr(formulaSet === 'ankhol' ? v.constArea : v.area)} × ${inr(v.devRate)}`} val={v.plotDev} />}
          {flags.hasConstructionFields && <Tot l="Construction Amount" sub="Construction Area × Construction Rate" sub2={`${inr(v.constArea)} × ${inr(v.constRate)}`} val={v.constAmt} />}
          {flags.hasConstructionFields && formulaSet === 'ankhol' && v.premiumLocation > 0 && <Tot l="Premium Location Charge" val={v.premiumLocation} />}
          {flags.hasConstructionFields && <Tot
            l="Total Basic Amount"
            sub={formulaSet === 'ankhol' ? 'Plot Basic + Plot Dev + Construction + Premium' : 'Plot Basic + Plot Dev + Construction'}
            val={formulaSet === 'ankhol' ? v.plotBasic + v.plotDev + v.constAmt + v.premiumLocation : v.plotBasic + v.plotDev + v.constAmt}
            subtotal />}
          {flags.hasSaleDeed && formulaSet !== 'ankhol' && <Tot l="Sale Deed" sub={saleDeedSub} sub2={saleDeedSub2} val={v.saleDeed} />}
          {formulaSet === 'ankhol' && <>
            <Tot l="Unit Price" sub={saleDeedSub} sub2={saleDeedSub2} val={v.saleDeed} />
            <Tot l="Extra Work Amount" val={v.nonSaleDeed} />
            <Fld l="Discount (₹)" val={f.discount} on={(t) => set('discount', t)} kb="numeric" />
            {v.discount > 0 && <Tot l="Final Extra Work Amount" sub="Extra Work Amount − Discount" val={v.nonSaleDeed - v.discount} />}
            <Tot l="Total Unit Price" sub={v.discount > 0 ? 'Unit Price + Final Extra Work Amount' : 'Unit Price + Extra Work Amount'} val={v.saleDeed + v.nonSaleDeed - v.discount} subtotal />
          </>}
          <Tot l="Legal & Other Charges" sub={extraSub} sub2={extraSub2} val={v.totalExtra} />
          {!!reviseId && v.extraWorkAmt > 0 && <Tot l="Extra Work" val={v.extraWorkAmt} />}
          {formulaSet !== 'ankhol' && <Tot l="Discount" val={-v.discount} />}
          <Tot l="Total Box Price" val={v.finalAmt} big />
        </View>

        <Sec title="Payment Schedule">
          <DateFld l="Booking Date *" val={f.booking_date} on={(t) => set('booking_date', t)} />
          <Fld l="CP / Channel Partner" val={f.cp_name} on={(t) => set('cp_name', t)} />
          <Fld l="No. of Installments" val={insts.length ? String(insts.length) : ''} on={buildInsts} kb="numeric" />
          {insts.map((r, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center' }}>
              <Text style={{ width: 16, color: MUTED }}>{i + 1}</Text>
              <DateField value={r.date} onChange={(t) => setInst(i, 'date', t)} style={{ flex: 2 }} />
              <TextInput value={r.pct} onChangeText={(t) => setInst(i, 'pct', t)} placeholder="%" keyboardType="numeric" style={[inpS, { flex: 1 }]} />
              <TextInput value={r.amt} onChangeText={(t) => setInst(i, 'amt', t)} placeholder="₹" keyboardType="numeric" style={[inpS, { flex: 1.4 }]} />
            </View>
          ))}
          {v.totalExtra > 0 && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center', backgroundColor: '#FFF8E1', borderRadius: 8, padding: 6 }}>
              <Text style={{ width: 16, color: '#92400E', fontWeight: '700', fontSize: 11 }}>Ex</Text>
              <DateField value={extraDate} onChange={setExtraDate} placeholder="Extra charges date" style={{ flex: 2 }} />
              <Text style={{ flex: 2.4, color: '#92400E', fontWeight: '700', fontSize: 12, textAlign: 'right' }}>Legal & Other Charges {rupee(v.totalExtra)}</Text>
            </View>
          )}
          {insts.length > 0 && <Text style={{ fontSize: 12, marginTop: 6, color: Math.abs(pctTotal - 100) < 0.01 ? COLORS.success : COLORS.error }}>Total {pctTotal.toFixed(2)}%</Text>}
          {formulaSet === 'ankhol' && nsdBase > 0 && (
            <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#065F46', marginBottom: 2 }}>Extra Work Amount Installments</Text>
              <Text style={{ fontSize: 11, color: MUTED, marginBottom: 8 }}>{rupee(nsdBase)}</Text>
              <Fld l="No. of Installments (Extra Work Amount)" val={nsdInsts.length ? String(nsdInsts.length) : ''} on={buildNsdInsts} kb="numeric" />
              {nsdInsts.map((r, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center' }}>
                  <Text style={{ width: 16, color: MUTED }}>{i + 1}</Text>
                  <DateField value={r.date} onChange={(t) => setNsdInst(i, 'date', t)} style={{ flex: 2 }} />
                  <TextInput value={r.pct} onChangeText={(t) => setNsdInst(i, 'pct', t)} placeholder="%" keyboardType="numeric" style={[inpS, { flex: 1 }]} />
                  <TextInput value={r.amt} onChangeText={(t) => setNsdInst(i, 'amt', t)} placeholder="₹" keyboardType="numeric" style={[inpS, { flex: 1.4 }]} />
                </View>
              ))}
              {nsdInsts.length > 0 && <Text style={{ fontSize: 12, marginTop: 6, color: Math.abs(nsdPctTotal - 100) < 0.01 ? COLORS.success : COLORS.error }}>Total {nsdPctTotal.toFixed(2)}%</Text>}
            </View>
          )}
        </Sec>

        {!!reviseId && (
          <Sec title="Extra Work (revise only)">
            <Fld l="Description" val={ew.desc} on={(t) => setEw((s) => ({ ...s, desc: t }))} />
            <Fld l="Total Amount (₹)" val={ew.amt} on={(t) => setEw((s) => ({ ...s, amt: t }))} kb="numeric" />
            <Fld l="No. of Installments" val={ewInsts.length ? String(ewInsts.length) : ''} on={buildEw} kb="numeric" />
            {ewInsts.map((r, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center' }}>
                <Text style={{ width: 16, color: MUTED }}>{i + 1}</Text>
                <DateField value={r.date} onChange={(t) => setEwInst(i, 'date', t)} style={{ flex: 2 }} />
                <TextInput value={r.pct} onChangeText={(t) => setEwInst(i, 'pct', t)} placeholder="%" keyboardType="numeric" style={[inpS, { flex: 1 }]} />
                <TextInput value={r.amt} onChangeText={(t) => setEwInst(i, 'amt', t)} placeholder="₹" keyboardType="numeric" style={[inpS, { flex: 1.4 }]} />
              </View>
            ))}
            {ewInsts.length > 0 && <Text style={{ fontSize: 12, marginTop: 6, color: Math.abs(ewPctTotal - 100) < 0.01 ? COLORS.success : COLORS.error }}>Extra Work Total {ewPctTotal.toFixed(2)}%</Text>}
          </Sec>
        )}

        <Sec title="📝 Extra Terms & Conditions (optional — added below the default terms)">
          {extraTerms.map((t, i) => (
            <View key={i} style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 10, marginBottom: 10, backgroundColor: COLORS.surfaceAlt }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: MUTED }}>Term {i + 1}</Text>
                <TouchableOpacity onPress={() => removeTerm(i)}><Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.error }}>✕ Remove</Text></TouchableOpacity>
              </View>
              <TextInput value={t.title} onChangeText={(x) => setTerm(i, 'title', x)} placeholder="Title (e.g. Possession)" style={[inpS, { marginBottom: 8 }]} />
              <TextInput value={t.desc} onChangeText={(x) => setTerm(i, 'desc', x)} placeholder="Description / clause text" multiline style={[inpS, { minHeight: 60, textAlignVertical: 'top' }]} />
            </View>
          ))}
          <TouchableOpacity onPress={addTerm} style={{ borderWidth: 1.5, borderColor: BLUE, borderStyle: 'dashed', borderRadius: 10, padding: 14, alignItems: 'center' }}>
            <Text style={{ color: BLUE, fontWeight: '700', fontSize: 14 }}>+ Add Extra Term</Text>
          </TouchableOpacity>
        </Sec>

        <Sec title="LOI Document">
          <TouchableOpacity onPress={genLoi} style={{ backgroundColor: '#7b2ff7', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>📄 Generate LOI (Download)</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={captureLoi} style={{ backgroundColor: COLORS.success, borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>📷 Capture signed LOI (multi-page → PDF)</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={pickLoi} style={{ borderWidth: 1.5, borderColor: BLUE, borderStyle: 'dashed', borderRadius: 10, padding: 14, alignItems: 'center' }}>
            <Text style={{ color: BLUE, fontWeight: '700', fontSize: 14 }}>📎 {loiFile ? loiFile.name : 'Attach signed LOI (image / PDF)'}</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>Generate → print/sign → capture pages or attach the signed copy → Submit.</Text>
        </Sec>

        {!!msg && (() => { const ok = msg.startsWith('✅') || msg.startsWith('📎'); return (
        <View style={{ padding: 12, borderRadius: 8, backgroundColor: ok ? COLORS.successBg : COLORS.errorBg, marginBottom: 12 }}>
          <Text style={{ color: ok ? COLORS.success : COLORS.error, fontSize: 13 }}>{msg}</Text>
        </View>); })()}
        <TouchableOpacity onPress={submit} disabled={saving} style={{ backgroundColor: COLORS.navy, borderRadius: 12, paddingVertical: 15, alignItems: 'center', opacity: saving ? 0.6 : 1 }}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Submit Booking</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const inpS = { backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: TEXT };
const Sec = ({ title, children }) => (
  <View style={CARD}>
    <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.6, color: BLUE, marginBottom: 10, textTransform: 'uppercase' }}>{title}</Text>
    {children}
  </View>
);
const Fld = ({ l, val, on, kb, ph, invalid }) => (
  <View style={{ marginBottom: 10 }}>
    <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4 }}>{l}</Text>
    <TextInput value={val} onChangeText={on} keyboardType={kb || 'default'} placeholder={ph}
      style={[inpS, invalid ? { borderColor: COLORS.error, backgroundColor: '#FEF2F2' } : null]} />
  </View>
);

// Dates are stored as YYYY-MM-DD (backend/LOI) but shown to the user as DD-MM-YYYY.
const ymdToDMY = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? `${m[3]}-${m[2]}-${m[1]}` : ''; };
const dateToYMD = (d) => { const z = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`; };

// Tappable field that opens the native calendar; emits YYYY-MM-DD, displays DD-MM-YYYY.
function DateField({ value, onChange, placeholder = 'DD-MM-YYYY', style }) {
  const [show, setShow] = useState(false);
  const display = ymdToDMY(value);
  const current = value ? new Date(`${value}T12:00:00`) : new Date();
  return (
    <>
      <TouchableOpacity onPress={() => setShow(true)} style={[inpS, { justifyContent: 'center' }, style]}>
        <Text style={{ fontSize: 13, color: display ? TEXT : '#9CA3AF' }}>{display || placeholder}</Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={current}
          mode="date"
          display="default"
          onChange={(event, d) => { setShow(false); if (event.type === 'set' && d) onChange(dateToYMD(d)); }}
        />
      )}
    </>
  );
}

// Labelled date field (used for Booking Date).
const DateFld = ({ l, val, on }) => (
  <View style={{ marginBottom: 10 }}>
    <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4 }}>{l}</Text>
    <DateField value={val} onChange={on} />
  </View>
);
const Calc = ({ l, sub, val }) => (
  <View style={{ marginBottom: 10 }}>
    <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 2 }}>{l}</Text>
    {!!sub && <Text style={{ fontSize: 10, color: '#9CA3AF', fontStyle: 'italic', marginBottom: 4 }}>{sub}</Text>}
    <View style={{ backgroundColor: '#F0F4FF', borderWidth: 1.5, borderColor: '#C5D8FB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: '#1a73e8' }}>{rupee(val)}</Text>
    </View>
  </View>
);
const Pick = ({ l, val, on, opts }) => (
  <View style={{ marginBottom: 10 }}>
    <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4 }}>{l}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {opts.map((o) => {
        const on2 = val === o;
        return (
          <TouchableOpacity key={o} onPress={() => on(on2 ? '' : o)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: on2 ? BLUE : COLORS.border, backgroundColor: on2 ? BLUE : COLORS.white }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: on2 ? '#fff' : MUTED }}>{o}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);
const Tot = ({ l, sub, sub2, val, valFmt, big, subtotal }) => (
  <View style={{
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: big ? 8 : subtotal ? 7 : 4, paddingHorizontal: subtotal ? 8 : 0,
    borderTopWidth: big ? 2 : 0, borderTopColor: '#B3CDF9', marginTop: big ? 6 : 0,
    ...(subtotal ? { backgroundColor: '#DBEAFE', borderRadius: 6, marginVertical: 4 } : {}),
  }}>
    <View style={{ flex: 1, paddingRight: 8 }}>
      <Text style={{ fontSize: big ? 15 : 13, fontWeight: (big || subtotal) ? '800' : '500', color: (big || subtotal) ? '#0D47A1' : '#4B5563' }}>{l}</Text>
      {!!sub && <Text style={{ fontSize: 10, color: '#9CA3AF' }}>{sub}</Text>}
      {!!sub2 && <Text style={{ fontSize: 10, color: '#9CA3AF' }}>{sub2}</Text>}
    </View>
    <Text style={{ fontSize: big ? 15 : 13, fontWeight: big ? '800' : '700', color: (big || subtotal) ? '#0D47A1' : TEXT }}>{valFmt || rupee(val)}</Text>
  </View>
);
