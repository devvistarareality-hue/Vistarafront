import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StatusBar, ActivityIndicator, Platform, Alert, Modal } from 'react-native';
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
import { openLoi } from '../../utils/openLoi';
import { SALES_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import { stripPlotPrefix } from '../../lib/plotNumber';
import { computeFormulas, fieldFlags, installmentBase, rupee } from '../../lib/bookingFormulas';
import { buildLOIHtml } from '../../lib/bookingLOIHtml';
import { computeShop, impliedUnitPct } from '../../lib/pratishthaShop';
import { computeFlat } from '../../lib/pratishthaFlat';

const MAX_LOI_FILE_SIZE_MB = 100;
const MAX_LOI_FILE_SIZE = MAX_LOI_FILE_SIZE_MB * 1024 * 1024;

const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary; const BLUE = COLORS.link;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 14, padding: 14, marginBottom: 12, ...CARD_SHADOW };
const safeDate = (s) => { const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(s || '')); return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : ''; };

export default function BookingFormScreen({ navigation, route }) {
  const me = useSelector((s) => s.auth.user);
  const companyId = useSelector((s) => s.adminFilter?.companyId);
  const cq = (sep) => (companyId ? `${sep}company_id=${companyId}` : '');
  const p = route?.params || {};
  const reviseId = p.revise || '';
  const draftId  = p.draft || '';   // resuming a saved draft
  // Id of the draft this form is persisting to — starts as the route's draft param,
  // but a fresh Save (no draft param yet) mints a new draft row and this captures
  // its id so every later Save in the same visit keeps updating that same row.
  const [savedDraftId, setSavedDraftId] = useState('');
  // Kiosk context: this form was opened from the client Kiosk — after submit, return to Kiosk.
  const kioskCtx = p.kiosk === '1' || p.kiosk === true;
  const convertEoiId = p.convertEoi || '';   // converting an EOI into a plot booking
  const [projectId, setProjectId] = useState(p.project ? String(p.project) : '');
  // Multi-plot: `plots` route param is a comma list of ids; fall back to single `plot`.
  const [priceBooks, setPriceBooks] = useState([]);   // Pratishtha: fixed per-unit figures
  const [unitLoaded, setUnitLoaded] = useState(false);   // selected unit resolved from the API
  // Per-shop overrides: { [unit]: { rate, mode: 'pct'|'amount', unitPct, unitAmount } }
  const [shopEdits, setShopEdits] = useState({});
  const [flatEdits, setFlatEdits] = useState({});
  const [plotIds, setPlotIds] = useState((p.plots ? String(p.plots) : (p.plot ? String(p.plot) : '')).split(',').map((s) => s.trim()).filter(Boolean));
  const plotId = plotIds[0] || '';
  const leadId = p.lead || '';
  // EOI (Expression of Interest): a booking on a project with no plots yet. No plot is
  // selected; a sequential per-project EOI code (EOI-1, EOI-2…) stands in for the plot no.
  // EOI mode applies when creating an EOI (eoi=1) OR revising an existing EOI (revise + eoi=1).
  const eoiMode = p.eoi === '1' || p.eoi === true || p.eoi === 'true';
  // Block-wise industrial: which block this EOI is against — drives the block-prefixed
  // EOI code (e.g. Block E → E1, E2…) instead of the default EOI-<n>.
  const eoiBlock = p.block || '';
  const [eoiNo, setEoiNo] = useState('');
  const [eoiType, setEoiType] = useState('');   // selected EOI standard unit type
  const [eoiUnits, setEoiUnits] = useState('1'); // no. of units — multiplies the standard area

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
  const [loiFile, setLoiFile] = useState(null); // a freshly attached file this session
  // Path of a signed LOI already saved on a resumed draft from an earlier Save —
  // distinct from loiFile, since we only have the backend path, not the file's bytes,
  // and don't need to re-upload it unless the rep attaches a replacement.
  const [savedLoiPath, setSavedLoiPath] = useState('');

  const [f, setF] = useState({
    client_name: p.client || '', gender: '', phone: p.phone || '', address: '', source: '',
    manual_stm_name: '',   // kiosk: the salesperson assisting, typed in
    area: '', area_unit: 'sq.yd', const_area: '', villa_type: '',
    land_rate: '', dev_rate: '', const_rate: '', sale_deed_rate: '', dev_agreement_rate: '',
    sale_deed_pct: '60', sale_deed_amount: '',
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
        // Pratishtha prices from each unit's fixed price book, not the form's rates.
        setPriceBooks(picked.map((x) => x.price_book).filter((b) => b && Object.keys(b).length));
        setPlotNo(picked.map((x) => stripPlotPrefix(x.number)).join(', '));
        const sumArea = picked.reduce((a, x) => a + (parseFloat((x.size || '').replace(/[^\d.]/g, '')) || 0), 0);
        // Auto-map construction area from the plot definition(s) into the booking.
        const sumConst = picked.reduce((a, x) => a + (parseFloat((x.construction_area || '').replace(/[^\d.]/g, '')) || 0), 0);
        setF((s) => ({
          ...s,
          area: sumArea ? String(+sumArea.toFixed(2)) : s.area,
          // When converting an EOI, Construction Area comes from the EOI, not the plot.
          const_area: (sumConst && !convertEoiId) ? String(+sumConst.toFixed(2)) : s.const_area,
        }));
      }
      setUnitLoaded(true);
    }).catch(() => setUnitLoaded(true));
    apiFetch(SALES_ENDPOINTS.sources + cq('?')).then(r => r.json()).then((d) => setSources(Array.isArray(d) ? d : [])).catch(() => {});
    // EOI: fetch the next per-project EOI code to show in the form + the EOI PDF.
    if (eoiMode && !reviseId && projectId) apiFetch(`${SALES_ENDPOINTS.bookings}next-eoi/?project=${projectId}${cq('&')}${eoiBlock ? `&block=${encodeURIComponent(eoiBlock)}` : ''}`)
      .then(r => (r.ok ? r.json() : null)).then((d) => { if (d && d.eoi_no) { setEoiNo(d.eoi_no); setPlotNo(d.eoi_no); } }).catch(() => {});
  }, [projectId, plotIds.join(','), companyId, eoiMode, eoiBlock]);

  // Revision prefill
  useEffect(() => {
    if (!reviseId) return;
    apiFetch(SALES_ENDPOINTS.bookings + cq('?')).then(r => r.json()).then((arr) => {
      const b = (Array.isArray(arr) ? arr : []).find((x) => String(x.id) === String(reviseId));
      if (!b) return;
      setProjectId(String(b.project));
      setPlotIds(((b.plot_ids && b.plot_ids.length ? b.plot_ids : [b.plot]).filter(Boolean)).map(String));
      // Revising an EOI: keep its existing EOI code (no plot, no next-EOI fetch).
      if (String(b.plot_numbers || '').toUpperCase().startsWith('EOI')) { setEoiNo(b.plot_numbers); setPlotNo(b.plot_numbers); }
      const srcDisp = (n) => { if (!n) return n; if (/^referral$/i.test(n)) return 'Reference'; if (/^other$/i.test(n)) return 'Other'; return n; };
      setF((s) => ({ ...s, client_name: b.client_name || '', gender: b.gender || '', phone: b.phone || '', address: b.address || '', source: srcDisp(b.source || ''),
        area: b.area || '', area_unit: b.area_unit || 'sq.yd', const_area: b.const_area || '', villa_type: b.villa_type || '',
        land_rate: String(b.land_rate), dev_rate: String(b.dev_rate), const_rate: String(b.const_rate), sale_deed_rate: String(b.sale_deed_rate), dev_agreement_rate: String(b.dev_agreement_rate),
        sale_deed_pct: b.sale_deed_pct != null ? String(b.sale_deed_pct) : '60',
        sale_deed_amount: b.sale_deed_amount ? String(b.sale_deed_amount) : '',
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

  // Resuming a saved draft: same prefill as revision mode, from the caller's own
  // drafts list (status=draft is always scoped server-side to the requester).
  useEffect(() => {
    if (!draftId) return;
    apiFetch(`${SALES_ENDPOINTS.bookings}?status=draft${cq('&')}`).then(r => r.json()).then((arr) => {
      const b = (Array.isArray(arr) ? arr : []).find((x) => String(x.id) === String(draftId));
      if (!b) return;
      setSavedDraftId(String(b.id));
      // A signed LOI attached before an earlier Save is already on the server — show
      // it as attached instead of asking the rep to re-upload it to resume.
      setSavedLoiPath(b.loi_document || '');
      setProjectId(String(b.project));
      setPlotIds(((b.plot_ids && b.plot_ids.length ? b.plot_ids : [b.plot]).filter(Boolean)).map(String));
      if (String(b.plot_numbers || '').toUpperCase().startsWith('EOI')) { setEoiNo(b.plot_numbers); setPlotNo(b.plot_numbers); }
      const srcDisp = (n) => { if (!n) return n; if (/^referral$/i.test(n)) return 'Reference'; if (/^other$/i.test(n)) return 'Other'; return n; };
      setF((s) => ({ ...s, client_name: b.client_name || '', gender: b.gender || '', phone: b.phone || '', address: b.address || '', source: srcDisp(b.source || ''),
        area: b.area || '', area_unit: b.area_unit || 'sq.yd', const_area: b.const_area || '', villa_type: b.villa_type || '',
        land_rate: String(b.land_rate), dev_rate: String(b.dev_rate), const_rate: String(b.const_rate), sale_deed_rate: String(b.sale_deed_rate), dev_agreement_rate: String(b.dev_agreement_rate),
        sale_deed_pct: b.sale_deed_pct != null ? String(b.sale_deed_pct) : '60',
        sale_deed_amount: b.sale_deed_amount ? String(b.sale_deed_amount) : '',
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
  }, [draftId]);

  // Convert EOI → LOI: prefill from the source EOI. Plot & Plot Area come from the picked
  // plot; Construction Area from the EOI. All fields editable (normal LOI booking).
  useEffect(() => {
    if (!convertEoiId) return;
    apiFetch(SALES_ENDPOINTS.bookings + cq('?')).then(r => r.json()).then((arr) => {
      const b = (Array.isArray(arr) ? arr : []).find((x) => String(x.id) === String(convertEoiId));
      if (!b) return;
      const srcDisp = (n) => { if (!n) return n; if (/^referral$/i.test(n)) return 'Reference'; if (/^other$/i.test(n)) return 'Other'; return n; };
      setF((s) => ({ ...s, client_name: b.client_name || '', gender: b.gender || '', phone: b.phone || '', address: b.address || '', source: srcDisp(b.source || ''),
        area_unit: b.area_unit || s.area_unit, const_area: b.const_area || '', villa_type: b.villa_type || '',
        land_rate: String(b.land_rate), dev_rate: String(b.dev_rate), const_rate: String(b.const_rate), sale_deed_rate: String(b.sale_deed_rate), dev_agreement_rate: String(b.dev_agreement_rate),
        sale_deed_pct: b.sale_deed_pct != null ? String(b.sale_deed_pct) : '60',
        land_sale_deed: String(b.land_sale_deed), const_agreement: String(b.const_agreement), premium_location: String(b.premium_location),
        discount: String(b.discount), legal_charges: String(b.legal_charges), maint_rate: String(b.maint_rate), maint_months: String(b.maint_months),
        apply_reg_fee: b.apply_reg_fee || 'Yes', apply_page_fee: b.apply_page_fee || 'Yes', apply_stamp_duty: b.apply_stamp_duty || 'Yes', apply_gst: b.apply_gst || 'Yes',
        booking_date: safeDate(b.booking_date) || s.booking_date, cp_name: b.cp_name || '' }));
      if (Array.isArray(b.installments)) {
        setInsts(b.installments.filter((i) => !i.isExtra && !i.isExtraWork && !i.isNsd).map((i) => ({ date: safeDate(i.date), pct: String(i.pct || ''), amt: String(i.amt || '') })));
        setNsdInsts(b.installments.filter((i) => i.isNsd).map((i) => ({ date: safeDate(i.date), pct: String(i.pct || ''), amt: String(i.amt || '') })));
      }
      if (Array.isArray(b.extra_terms)) setExtraTerms(b.extra_terms.map((t) => ({ title: t.title || '', desc: t.desc || '' })));
    }).catch(() => {});
  }, [convertEoiId]);

  const formulaSet = project?.formula_set || 'kalrav';
  const flags = useMemo(() => fieldFlags(formulaSet), [formulaSet]);
  // All pricing sets share the sale-deed % split (Unit Price + Additional Extra Work Amount).
  // Which pricing sections apply depends on the project's formula set and, for a unit
  // booking, on that unit's price book — the latter isn't known on the first paint.
  // Render a placeholder until it resolves, otherwise the rate layout flashes up and is
  // then replaced.
  const pricingReady = !!project && (eoiMode || !plotIds.length || unitLoaded);

  // Pratishtha prices each unit from its price book, and there is no instalment
  // schedule. A booking can cover several units, so every selected one is priced and
  // the totals are summed. Both kinds are computed from a small set of editable
  // drivers: shops from Rate + Total Unit Price, flats from Flat Rate + Token.
  const rawBooks = formulaSet === 'pratishtha' ? priceBooks : [];
  // Seeds come from the unit's own price book, and a patch merges onto the seed rather
  // than onto an empty stub — otherwise the first edit to any one field (switching plan,
  // toggling % / Rs.) would create a state with the *other* fields missing and blank
  // their inputs.
  const shopSeed = (pb) => ({ rate: String(pb.rate ?? ''), mode: 'pct', unitPct: String(impliedUnitPct(pb)), unitAmount: String(pb.loan_amount ?? '') });
  const shopEdit = (pb) => shopEdits[pb.unit] || shopSeed(pb);
  const setShopEdit = (pb, patch) => setShopEdits((m) => ({ ...m, [pb.unit]: { ...(m[pb.unit] || shopSeed(pb)), ...patch } }));
  const flatSeed = (pb) => ({ plan: 'Regular', flatPrice: String(pb.flat_price ?? ''), token: String(pb.token ?? '') });
  const flatEdit = (pb) => flatEdits[pb.unit] || flatSeed(pb);
  const setFlatEdit = (pb, patch) => setFlatEdits((m) => ({ ...m, [pb.unit]: { ...(m[pb.unit] || flatSeed(pb)), ...patch } }));
  // Only a Down Payment plan may move the rate or token. On Regular the unit prices
  // straight from the price book — passing no overrides at all, so switching back from
  // Down Payment cannot leave an edited figure behind.
  const isDownPayment = (pb) => flatEdit(pb).plan === 'Down Payment';
  const flatOverrides = (pb) => (isDownPayment(pb) ? flatEdit(pb) : {});
  const pratBooks = rawBooks.map((pb) => (pb.kind === 'shop'
    ? computeShop(pb, shopEdit(pb))
    : computeFlat(pb, flatOverrides(pb))));
  const prat = pratBooks[0] || null;
  const pratRowsFor = (pb) => (pb.kind === 'shop'
    ? [['Shop Area', `${pb.sq_feet} sq.ft`], ['Rate', rupee(pb.rate) + ' / sq.ft'],
       ['Shop Amount', rupee(pb.amount), 'sub'],
       // Grouped like the flats: the charge bifurcation, then the documented split.
       // Grand Total is Shop Amount + Total Legal & Other Charges, so those two are
       // the figures to read.
       { h: 'Legal & Other Charges' },
       ['Stamp Duty & Registration (6% of Final Unit Price)', rupee(pb.stamp_duty_reg)],
       ['GST (5% of Final Unit Price)', rupee(pb.gst)], ['AUDA (Rs.400/sq.ft)', rupee(pb.auda)],
       ['6 Months Maintenance Advance', rupee(pb.maint_adv_6m)],
       ['12 Months Maintenance Deposit', rupee(pb.maint_dep_12m)],
       ['Legal Charges', rupee(pb.legal)],
       ['Total Legal & Other Charges', rupee(pb.total_extra), 'sub'],
       { h: 'What This Price Includes' },
       ['Final Unit Price', rupee(pb.loan_amount)],
       ['Total Legal & Other Charges', rupee(pb.total_extra)],
       ['Extra Work Amount', rupee(pb.extra_work_amount)]]
    : [['Facing', pb.facing === 'road' ? 'Road Facing' : pb.facing === 'garden' ? 'Garden Facing' : '—'],
       ['Flat Area', `${pb.flat_area} sq.yd`],
       ['Flat Rate', rupee(pb.flat_rate) + ' / sq.yd'],
       ['Flat Price', rupee(pb.flat_price)],
       ...(pb.terrace_area
         ? [['Additional Terrace Area', `${pb.terrace_area} sq.yd`],
            ['Terrace Rate (Flat Rate / 2)', rupee(pb.terrace_rate) + ' / sq.yd'],
            ['Additional Terrace Price (Terrace Area x Terrace Rate)', rupee(pb.terrace_price)]]
         : [['Additional Terrace Area', '—']]),
       [pb.is_down_payment ? 'Unit Price (Flat Price + Terrace Price)' : 'Box Price (Flat Price + Terrace Price)', rupee(pb.box_price), 'sub'],
       // Same split as the LOI: what the price is made up of, then how it is funded.
       // Both add to the Total, so listing them together reads as double the price.
       { h: 'What This Price Includes' },
       // Down Payment quotes four figures that add to the total; Regular breaks the
       // box price down into what it already contains.
       ...(pb.is_down_payment
         ? [['Unit Price (Flat Price + Terrace Price)', rupee(pb.box_price)],
            ['Total Legal & Other Charges (Unit Price x 7% + Legal Charges)', rupee(pb.total_extra)],
            ['6 Months Advance Maintenance (1.5 x 9 x Area x 6)', rupee(pb.maint_adv_6m)],
            ['12 Months Maintenance Deposit (1.5 x 9 x Area x 12)', rupee(pb.maint_adv_12m)],
            ['Total Legal & Extra Charges', rupee(pb.total_legal_extra), 'sub']]
         : [['Final Unit Price ((Box Price - Bank Processing) / 1.07)', rupee(pb.dastavej_value)],
            ['Stamp Duty + Registration (Final Unit Price x 6%)', rupee(pb.stamp_duty_reg)],
            ['GST (Final Unit Price x 1%)', rupee(pb.gst)],
            ['Bank Processing Charges (Bank Loan x 4.5%)', rupee(pb.bank_processing)]]),
       // Down Payment has no loan to describe, and its four rows already add to the
       // footer total — so no How You Pay section and no duplicate subtotal above it.
       ...(pb.is_down_payment
         ? []
         : [['Total All Inclusive Amount', rupee(pb.total), 'sub'],
            { h: 'How You Pay' },
            ['Token', rupee(pb.token)],
            ['Bank Loan (Box Price - Token)', rupee(pb.bank_loan)]])]);
  // The stored unit number may already carry the word ("Shop1"), so don't repeat it:
  // "Shop1" -> "Shop 1", "101" -> "Flat 101".
  const unitTitle = (pb) => {
    const kind = pb.kind === 'shop' ? 'Shop' : 'Flat';
    const n = String(pb.unit || '').trim();
    const bare = n.replace(new RegExp('^' + kind + '\\s*', 'i'), '');
    return kind + ' ' + (bare || n);
  };
  // A Down Payment flat is paid in instalments against the Box Price only — flats carry
  // no extra work, so there is no second schedule. The three charge lines fall due on
  // the sale deed or possession instead, so they are carried as undated extras.
  const pratDp   = prat && pratBooks.some((b) => b.is_down_payment);
  const pratShop = prat && pratBooks.some((b) => b.kind === 'shop');
  const pratSched = pratDp || pratShop;   // the units that are paid in instalments
  // Shops follow Ankhol: an Extra Work Amount schedule, then the unit price, then the
  // charges. A Down Payment flat has no extra work, so only the middle table applies.
  // Summed per unit so a booking covering both kinds still adds up.
  const pratPer = (fn) => pratBooks.reduce((sum, b) => sum + (Number(fn(b)) || 0), 0);
  const pratUnitBase = pratPer((b) => (b.kind === 'shop' ? b.loan_amount : (b.is_down_payment ? b.box_price : 0)));
  const pratEwBase   = pratPer((b) => (b.kind === 'shop' ? b.extra_work_amount : 0));
  // One line on the schedule, not several: the itemisation already sits in the pricing
  // panel above, and the whole amount falls due on the same date.
  const pratExtras = () => {
    const amt = Math.round(pratPer((b) => (b.kind === 'shop' ? b.total_extra : (b.is_down_payment ? b.total_legal_extra : 0))));
    return amt > 0
      ? [{ no: 'Extra', date: '', amt, isExtra: true,
           label: pratDp ? 'Total Legal & Extra Charges' : 'Total Legal & Other Charges' }]
      : [];
  };
  const pbTotal = (pb) => (pb.grand_total ?? pb.box_price ?? 0);
  const pratTotal = pratBooks.reduce((sum, pb) => sum + pbTotal(pb), 0);
  const pratExtraTotal = pratBooks.reduce((sum, pb) => sum + (pb.total_extra || 0), 0);

  const hasSaleDeedSplit = formulaSet === 'ankhol' || formulaSet === 'kalrav' || formulaSet === 'industrial';
  // EOI standard sizes are per-unit; the No. of Units field multiplies Plot/Construction Area.
  const applyEoiUnit = (name, unitsStr) => {
    const t = (project?.eoi_unit_types || []).find((x) => x.type === name);
    const n = Math.max(1, parseInt(unitsStr, 10) || 1);
    setF((s) => ({ ...s, villa_type: name,
      area:       t ? String((+t.plot_area  || 0) * n) : s.area,
      const_area: t ? String((+t.const_area || 0) * n) : s.const_area }));
  };
  const v = useMemo(() => computeFormulas({
    formulaSet, projectName: project?.name, loiVariant: project?.loi_variant,
    area: f.area, landRate: f.land_rate, devRate: f.dev_rate, constArea: f.const_area, constRate: f.const_rate,
    discount: f.discount, legalCharges: f.legal_charges, maintRate: f.maint_rate, maintMonths: f.maint_months,
    gender: f.gender, landSaleDeed: f.land_sale_deed, constAgreement: f.const_agreement,
    premiumLocation: f.premium_location, saleDeedRate: f.sale_deed_rate, devAgreementRate: f.dev_agreement_rate,
    saleDeedPct: f.sale_deed_pct, saleDeedAmount: f.sale_deed_amount,
    applyRegFee: f.apply_reg_fee, applyPageFee: f.apply_page_fee, applyStampDuty: f.apply_stamp_duty, applyGst: f.apply_gst,
    extraWorkAmt: reviseId ? ew.amt : 0, extraWorkDesc: ew.desc,
  }), [f, formulaSet, project, ew, reviseId]);
  useEffect(() => {
    if (!editingAmtRef.current) setDeedAmtStr(String(Math.round(v.saleDeed) || ''));
  }, [v.saleDeed]);

  // Confirm before leaving the booking form once meaningful data has been entered
  // (intercepts header back, hardware back and the swipe-back gesture).
  const isDirty = !!(f.land_rate || f.dev_rate || f.const_rate || f.premium_location || f.sale_deed_amount
    || f.legal_charges || f.maint_rate || insts.length || nsdInsts.length || deedAmtStr || loiFile);
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (ev) => {
      if (!isDirty) return;
      ev.preventDefault();
      Alert.alert('Discard booking?', 'You have unsaved booking details. Are you sure you want to go back?', [
        { text: 'Stay', style: 'cancel' },
        { text: 'Go Back', style: 'destructive', onPress: () => navigation.dispatch(ev.data.action) },
      ]);
    });
    return unsub;
  }, [navigation, isDirty]);
  const base = pratSched ? pratUnitBase : installmentBase(v);
  const pctTotal = base ? insts.reduce((a, r) => a + (parseFloat(r.amt) || 0), 0) / base * 100 : insts.reduce((a, r) => a + (parseFloat(r.pct) || 0), 0);
  const ewBase = parseFloat(ew.amt) || 0;
  const ewPctTotal = ewBase ? ewInsts.reduce((a, r) => a + (parseFloat(r.amt) || 0), 0) / ewBase * 100 : ewInsts.reduce((a, r) => a + (parseFloat(r.pct) || 0), 0);
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
  const sdPct = Math.round((v.saleDeedPct || 0) * 100) / 100;   // display % capped at 2 decimals
  const saleDeedSub = hasSaleDeedSplit ? `${sdPct}% × Total Basic Amount` : 'Sale Deed Rate × Plot Area';
  const saleDeedSub2 = hasSaleDeedSplit
    ? `${sdPct}% × ${inr(v.plotBasic + v.plotDev + v.constAmt + v.premiumLocation)}`
    : `${inr(v.saleDeedRate)} × ${inr(v.area)}`;
  const stampSub = (hasSaleDeedSplit && f.apply_stamp_duty === 'No') ? 'Not applicable'
    : (formulaSet === 'kalrav' ? (v.isKalrav3 ? '4.9% of Unit Price' : '4.9% of Land Sale Deed') : '4.9% of Sale Deed');
  const pageFeeTxt = f.apply_page_fee === 'No' ? '' : ' + ₹1,500';
  const femPage = f.apply_page_fee === 'No' ? '₹0' : '₹1,500';
  const regSub = f.apply_reg_fee === 'No'
    ? (f.apply_page_fee === 'No' ? 'Not applicable' : 'Page Fee only (₹1,500)')
    : (formulaSet === 'ankhol' ? `1% of Sale Deed${pageFeeTxt}`
      : formulaSet === 'industrial' ? `Male: 1% Sale Deed${pageFeeTxt} | Female: ${femPage}`
      : v.isKalrav3 ? `Male: 1% Unit Price${pageFeeTxt} | Female: ${femPage}`
      : `Male: 1% LSD${pageFeeTxt} | Female: ${femPage}`);
  const gstSub = (hasSaleDeedSplit && f.apply_gst === 'No') ? 'Not applicable'
    : (formulaSet === 'ankhol' ? '5% of Sale Deed'
      : formulaSet === 'industrial' ? (v.isTundav ? '18% of 67% of Sale Deed' : '18% of Development Agreement')
      : v.isKalrav3 ? '5% of Unit Price'
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
        if (k === 'amt') nr.pct = val && ewBase ? String(parseFloat((parseFloat(val) / ewBase * 100).toFixed(2))) : '';
        return nr;
      });
      const last = next.length - 1;
      if (last > 0 && i < last) {
        const usedAmt = next.slice(0, last).reduce((a, r) => a + (parseFloat(r.amt) || 0), 0);
        const remAmt = Math.max(0, Math.round((ewBase || 0) - usedAmt));
        const remPct = ewBase ? parseFloat((remAmt / ewBase * 100).toFixed(2)) : 0;
        next[last] = { ...next[last], amt: String(remAmt), pct: String(remPct) };
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
        if (k === 'amt') nr.pct = val && base ? String(parseFloat((parseFloat(val) / base * 100).toFixed(2))) : '';
        return nr;
      });
      const last = next.length - 1;
      if (last > 0 && i < last) {
        const usedAmt = next.slice(0, last).reduce((a, r) => a + (parseFloat(r.amt) || 0), 0);
        const remAmt = Math.max(0, Math.round((base || 0) - usedAmt));
        const remPct = base ? parseFloat((remAmt / base * 100).toFixed(2)) : 0;
        next[last] = { ...next[last], amt: String(remAmt), pct: String(remPct) };
      }
      return next;
    });
  }
  const nsdBase = pratSched ? pratEwBase : Math.max(0, (v.nonSaleDeed || 0) - (v.discount || 0));
  const nsdPctTotal = nsdBase ? nsdInsts.reduce((a, r) => a + (parseFloat(r.amt) || 0), 0) / nsdBase * 100 : nsdInsts.reduce((a, r) => a + (parseFloat(r.pct) || 0), 0);
  // An instalment's amount is worked out from its % at the moment the % is typed. Nothing
  // revisited it when the base moved, so entering the price after setting the schedule
  // left every amount against the old base — 33% of a 20,00,000 unit showing as 66.
  // The percentages are the source of truth: re-derive the amounts whenever a base
  // changes, giving the last row the remainder so a schedule always sums to its base.
  // Applies to all three schedules (unit price, extra work charges, extra work) and so
  // to every pricing model and to EOIs, which share this table.
  const rebaseRows = (arr, b) => {
    if (!arr.length || !b) return arr;
    const next = arr.map((r) => {
      const pct = parseFloat(r.pct) || 0;
      return pct ? { ...r, amt: String(Math.round(b * pct / 100)) } : r;
    });
    // Give the last row the remainder only when the schedule is a complete one, so
    // rounding never leaves it a rupee short of the base. An EOI may carry a partial
    // (token) schedule on purpose — inflating its last row to 100% would misstate it.
    const last = next.length - 1;
    const pctSum = next.reduce((a, r) => a + (parseFloat(r.pct) || 0), 0);
    if (last > 0 && Math.abs(pctSum - 100) < 0.5) {
      const used = next.slice(0, last).reduce((a, r) => a + (parseFloat(r.amt) || 0), 0);
      const rem = Math.max(0, Math.round(b - used));
      next[last] = { ...next[last], amt: String(rem), pct: String(parseFloat((rem / b * 100).toFixed(2))) };
    }
    return next;
  };
  const useRebase = (b, setRows) => {
    const prev = useRef(b);
    useEffect(() => {
      if (prev.current === b) return;
      prev.current = b;
      if (b) setRows((arr) => rebaseRows(arr, b));
    }, [b]);
  };
  useRebase(base, setInsts);
  useRebase(nsdBase, setNsdInsts);
  useRebase(ewBase, setEwInsts);

  function buildNsdInsts(n) { n = parseInt(n, 10) || 0; setNsdInsts(Array.from({ length: n }, (_, i) => nsdInsts[i] || { date: '', pct: '', amt: '' })); }
  function setNsdInst(i, k, val) {
    setNsdInsts((arr) => {
      const next = arr.map((r, idx) => {
        if (idx !== i) return r;
        const nr = { ...r, [k]: val };
        if (k === 'pct') nr.amt = val && nsdBase ? String(Math.round(nsdBase * parseFloat(val) / 100)) : '';
        if (k === 'amt') nr.pct = val && nsdBase ? String(parseFloat((parseFloat(val) / nsdBase * 100).toFixed(2))) : '';
        return nr;
      });
      const last = next.length - 1;
      if (last > 0 && i < last) {
        const usedAmt = next.slice(0, last).reduce((a, r) => a + (parseFloat(r.amt) || 0), 0);
        const remAmt = Math.max(0, Math.round((nsdBase || 0) - usedAmt));
        const remPct = nsdBase ? parseFloat((remAmt / nsdBase * 100).toFixed(2)) : 0;
        next[last] = { ...next[last], amt: String(remAmt), pct: String(remPct) };
      }
      return next;
    });
  }
  function instArr() {
    const arr = insts.map((r, i) => ({ no: i + 1, date: r.date, pct: parseFloat(r.pct) || 0, amt: parseFloat(r.amt) || 0 }));
    if (prat) {
      if (!pratSched) return [];
      // isNsd marks the Extra Work Amount rows — the LOI prints those per hundred.
      nsdInsts.forEach((r, i) => arr.push({ no: i + 1, date: r.date, pct: parseFloat(r.pct) || 0, amt: parseFloat(r.amt) || 0, isNsd: true }));
      return arr.concat(pratExtras());
    }
    nsdInsts.forEach((r, i) => arr.push({ no: i + 1, date: r.date, pct: parseFloat(r.pct) || 0, amt: parseFloat(r.amt) || 0, isNsd: true }));
    arr.push({ no: 'Extra', date: extraDate, amt: Math.round(v.totalExtra), isExtra: true });
    return arr;
  }

  async function genLoi() {
    {
      const e = {};
      if (!f.client_name.trim()) e.client_name = true;
      if (!f.phone.trim()) e.phone = true;
      // Pratishtha has no rate fields — its amounts come from the unit's price book, so
      // requiring area/land rate would flag inputs that aren't on the form.
      if (!prat && !v.plotBasic) { if (!f.area) e.area = true; if (!f.land_rate) e.land_rate = true; }
      if (Object.keys(e).length) { setErrs(e); setMsg('Please fill the highlighted fields.'); return; }
      setErrs({});
    }
    // Installments must total 100% before the LOI — EXCEPT for an EOI, where a partial
    // (token) schedule is allowed and the 100% rule does not apply.
    // A Down Payment Pratishtha flat now has a real schedule, so it is held to the same
    // 100% rule; a Regular one has no schedule at all and is skipped.
    if ((!prat || pratSched) && !eoiMode) {
      if (!insts.length) { setMsg('Add the payment installments before downloading the LOI.'); return; }
      if (Math.abs(pctTotal - 100) > 0.01) { setMsg('Payment installments must total 100% before downloading the LOI.'); return; }
      if ((hasSaleDeedSplit || pratShop) && nsdBase > 0 && (!nsdInsts.length || Math.abs(nsdPctTotal - 100) > 0.01)) {
        setMsg('Extra Work Amount installments must be filled and total 100% before downloading the LOI.'); return;
      }
    }
    const meta = {
      clientName: f.client_name, phoneNumber: f.phone, gender: f.gender, address: f.address,
      project: project?.name, plotNo: plotNo, bookingDate: f.booking_date,
      villaType: f.villa_type, bunglowType: flags.bunglowTypeFixed || '', cpName: f.cp_name, loggedInUser: (f.manual_stm_name || '').trim() || me?.name, source: f.source,
      areaUnit: f.area_unit || flags.areaUnit,
    };
    try {
      const html = buildLOIHtml(meta, v, instArr(), { formulaSet, projectName: project?.name, loiVariant: project?.loi_variant, projectLogoUrl: project?.logo_url, isRevision: !!reviseId, revNo: (reviseId ? 1 : 0), extraWorkInst: ewArr(), extraTerms: cleanTerms(), areaUnit: f.area_unit || flags.areaUnit, priceBooks: pratBooks });
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
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists && info.size > MAX_LOI_FILE_SIZE) {
        setMsg(`File too large — max ${MAX_LOI_FILE_SIZE_MB} MB.`);
        return;
      }
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
      let size = a.size;
      if (size == null) { const info = await FileSystem.getInfoAsync(a.uri); size = info.exists ? info.size : 0; }
      if (size > MAX_LOI_FILE_SIZE) { setMsg(`File too large — max ${MAX_LOI_FILE_SIZE_MB} MB.`); return; }
      const data = await FileSystem.readAsStringAsync(a.uri, { encoding: FileSystem.EncodingType.Base64 });
      setLoiFile({ name: a.name || 'signed_loi.pdf', type: a.mimeType || 'application/pdf', data });
      setMsg('📎 Attached ' + (a.name || 'file'));
    } catch (e) { setMsg('Attach failed: ' + e.message); }
  }

  // Shared by submit() and saveDraft() so the two payloads never drift apart.
  function buildPayload() {
    return {
      project: projectId, plot: eoiMode ? undefined : plotId, plot_ids: eoiMode ? [] : plotIds, lead: leadId || undefined,
      ...(eoiMode ? { eoi: true, eoi_no: eoiNo, ...(eoiBlock ? { eoi_block: eoiBlock } : {}) } : {}),
      client_name: f.client_name.trim(), gender: f.gender, phone: f.phone.trim(), address: f.address, source: f.source,
      manual_stm_name: (f.manual_stm_name || '').trim(),
      formula_set: formulaSet, area: f.area, area_unit: f.area_unit, const_area: f.const_area || '0',
      villa_type: flags.bunglowTypeIsDropdown ? f.villa_type : '', bunglow_type: flags.bunglowTypeFixed || '',
      land_rate: f.land_rate || 0, dev_rate: f.dev_rate || 0, const_rate: f.const_rate || 0,
      sale_deed_rate: f.sale_deed_rate || 0, dev_agreement_rate: f.dev_agreement_rate || 0,
      sale_deed_pct: f.sale_deed_pct === '' || f.sale_deed_pct == null ? 60 : f.sale_deed_pct,
      sale_deed_amount: f.sale_deed_amount || 0,
      maint_rate: f.maint_rate || 0, maint_months: f.maint_months || 0,
      plot_basic: Math.round(v.plotBasic), plot_dev: Math.round(v.plotDev), const_amt: Math.round(v.constAmt),
      sale_deed: Math.round(v.saleDeed), dev_agreement: Math.round(v.devAgreement),
      land_sale_deed: f.land_sale_deed || 0, const_agreement: f.const_agreement || 0,
      stamp_duty: Math.round(v.stampDuty), reg_fees: Math.round(v.regFees), gst: Math.round(v.gst),
      maintenance: Math.round(v.maint), maint_deposit: Math.round(v.maintDeposit), maint_advance: Math.round(v.maintAdvance),
      legal_charges: f.legal_charges || 0, premium_location: f.premium_location || 0,
      total_extra: Math.round(prat ? pratExtraTotal : v.totalExtra), discount: f.discount || 0,
      final_amount: Math.round(prat ? pratTotal : v.finalAmt),
      apply_reg_fee: f.apply_reg_fee, apply_page_fee: f.apply_page_fee, apply_stamp_duty: f.apply_stamp_duty, apply_gst: f.apply_gst,
      // A Regular Pratishtha unit is a fixed box price with no staged payments; a Down
      // Payment one is paid in instalments against the box price.
      installments: instArr(),
      booking_date: f.booking_date, cp_name: f.cp_name,
      extra_work_desc: reviseId ? (ew.desc || '') : '',
      extra_work_amount: reviseId ? Math.round(parseFloat(ew.amt) || 0) : 0,
      extra_work_inst: reviseId ? ewArr() : [],
      extra_terms: cleanTerms(),
      loi_file: loiFile, ...(reviseId ? { revision_of: reviseId } : {}),
    };
  }

  async function submit() {
    {
      const e = {};
      if (!f.client_name.trim()) e.client_name = true;
      if (!f.phone.trim()) e.phone = true;
      if (!prat && (!f.land_rate || !v.plotBasic)) { e.land_rate = true; if (!f.area) e.area = true; }
      if (Object.keys(e).length) { setErrs(e); setMsg('Please fill the highlighted fields.'); return; }
      setErrs({});
    }
    if ((!prat || pratSched) && !eoiMode && insts.length && Math.abs(pctTotal - 100) > 0.01) { setMsg('Installments must total 100%.'); return; }
    if (!loiFile && !savedLoiPath) { setMsg('Generate the LOI, get it signed, and attach it before submitting.'); return; }
    setSaving(true); setMsg('');
    const payload = {
      ...buildPayload(),
      ...((draftId || savedDraftId) ? { draft_id: draftId || savedDraftId } : {}),
    };
    try {
      const res = await apiFetch(SALES_ENDPOINTS.bookings + cq('?'), { method: 'POST', body: JSON.stringify(payload) });
      if (res.ok) {
        // Leave the button disabled (saving stays true) — the Alert is modal, but
        // resetting saving here left a window where a stray tap could still
        // re-fire submit before the screen navigates away, producing an
        // identical duplicate booking (confirmed in production).
        Alert.alert('Booking submitted ✅', 'Your booking has been submitted and sent for approval.', [
          { text: 'OK', onPress: () => navigation.navigate(kioskCtx ? 'Kiosk' : 'ClosureProjects') },
        ]);
        return;
      }
      const errData = await res.json().catch(() => ({}));
      setMsg('Error: ' + (errData.detail || JSON.stringify(errData)));
    } catch (e) { setMsg(e.message); }
    setSaving(false);
  }

  // Save Draft: none of Submit's completeness checks apply — the whole point is to
  // never lose typed data, even if it's just a client name so far.
  async function saveDraft() {
    setSaving(true); setMsg('');
    const payload = { ...buildPayload(), ...(savedDraftId ? { id: savedDraftId } : {}) };
    try {
      const res = await apiFetch(SALES_ENDPOINTS.bookingDraft, { method: 'POST', body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSavedDraftId(String(data.id));
        if (data.loi_document) setSavedLoiPath(data.loi_document);
        const conflicts = data.plot_conflicts || [];
        setMsg(conflicts.length
          ? `✅ Draft saved — but Plot ${conflicts.map((c) => c.number).join(', ')} is no longer held for you.`
          : '✅ Draft saved — safe to come back later.');
      } else {
        setMsg('Error: ' + (data.detail || JSON.stringify(data)));
      }
    } catch (e) { setMsg(e.message); }
    setSaving(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.screenBg }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <Modal visible={saving} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <ActivityIndicator size="large" color={COLORS.navy} />
          <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT }}>Submitting booking…</Text>
        </View>
      </Modal>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.screenBg, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: TEXT }}>{reviseId ? (eoiMode ? 'Revise EOI' : 'Revise Booking') : eoiMode ? 'Create EOI' : (plotIds.length > 1 ? 'Book Units' : prat ? (prat.kind === 'shop' ? 'Book Shop' : 'Book Flat') : 'Book Unit')} <Text style={eoiMode ? { color: '#E4571A' } : null}>{eoiMode ? (eoiNo || '…') : plotNo}</Text></Text>
          <Text style={{ fontSize: 12, color: MUTED }}>{project?.name || '…'} · {formulaSet.toUpperCase()}{eoiMode ? ' · EOI · no plot' : ''}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Sec title="Client">
          <Fld l="Client Name *" val={f.client_name} on={(t) => set('client_name', t)} invalid={errs.client_name} />
          <Pick l="Gender *" val={f.gender} on={(x) => set('gender', x)} opts={['Male', 'Female']} />
          <Fld l="Phone *" val={f.phone} on={(t) => set('phone', t)} kb="phone-pad" invalid={errs.phone} />
          <Pick l="Source" val={f.source} on={(x) => set('source', x)} opts={(() => { const mapped = sources.map(s => { if (/^referral$/i.test(s.name)) return 'Reference'; if (/^other$/i.test(s.name)) return 'Other'; return s.name; }); const extra = ['Reference', 'Channel Partner', 'Other'].filter(n => !mapped.some(m => m.toLowerCase() === n.toLowerCase())); return [...mapped, ...extra]; })()} />
          {/^reference$/i.test(f.source) && <Fld l="Reference Name" val={f.cp_name} on={(t) => set('cp_name', t)} />}
          {/^channel partner$/i.test(f.source) && <Fld l="Channel Partner Name" val={f.cp_name} on={(t) => set('cp_name', t)} />}
          {/^other$/i.test(f.source) && <Fld l="Other" val={f.cp_name} on={(t) => set('cp_name', t)} />}
          {/* Kiosk: the booking is created by the kiosk account, so the salesperson
              assisting types their own name — it's what the LOI prints as STM Name. */}
          {kioskCtx && <Fld l="STM Name" val={f.manual_stm_name} on={(t) => set('manual_stm_name', t)} ph="Sales team member assisting" />}
        </Sec>

        {!pricingReady ? (
          <Sec title="Pricing">
            <Text style={{ fontSize: 13, color: MUTED }}>Loading unit pricing…</Text>
          </Sec>
        ) : prat ? (
          /* Pratishtha: every figure is fixed in each unit's price book — shown, not entered.
             A booking can cover several units, so each is priced separately and summed. */
          <>
            {pratBooks.map((pb, idx) => (
              <Sec key={idx} title={`Unit Pricing · ${unitTitle(pb)}`}>
                {idx === 0 ? (
                  <Text style={{ fontSize: 12, color: MUTED, marginBottom: 10 }}>
                    Figures come from the Pratishtha price book. Adjust the highlighted drivers and every dependent line recalculates.
                  </Text>
                ) : null}
                {pb.kind !== 'shop' ? (() => {
                  const e = flatEdit(pb);
                  const dp = isDownPayment(pb);
                  const lock = { backgroundColor: '#EEF1F7', color: MUTED };
                  return (
                    <View style={{ borderWidth: 1.5, borderColor: '#C7D2FE', backgroundColor: '#F5F7FF', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: BLUE, letterSpacing: 0.5, marginBottom: 8 }}>
                        {dp ? 'EDITABLE · EVERYTHING BELOW RECALCULATES' : 'PLAN'}
                      </Text>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4 }}>Plan</Text>
                      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                        {['Regular', 'Down Payment'].map((pl) => {
                          const on = (e.plan || 'Regular') === pl;
                          // Switching to Down Payment clears the price rather than carrying the
                          // price-book figure over: the plan exists to enter a negotiated one,
                          // and a pre-filled default is easy to leave in by mistake.
                          return (
                            <TouchableOpacity key={pl} onPress={() => setFlatEdit(pb, pl === 'Down Payment'
                              ? { plan: pl, flatPrice: '0' } : { plan: pl })}
                              style={{ flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, alignItems: 'center',
                                borderColor: on ? BLUE : COLORS.border, backgroundColor: on ? BLUE : COLORS.white }}>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: on ? '#fff' : MUTED }}>{pl}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4 }}>Flat Price (Rs.)</Text>
                      <TextInput editable={dp} keyboardType="numeric"
                        value={dp ? String(e.flatPrice ?? '') : String(pb.flat_price)}
                        onChangeText={(t) => setFlatEdit(pb, { flatPrice: t })}
                        style={{ borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
                          fontSize: 14, marginBottom: 10, color: dp ? TEXT : MUTED, backgroundColor: dp ? COLORS.white : lock.backgroundColor }} />
                      {/* No token on a Down Payment plan — there is no loan, and the section
                          that used to quote it is gone. */}
                      {!dp ? (
                        <>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4 }}>Token</Text>
                          <TextInput editable={false} keyboardType="numeric" value={String(pb.token)}
                            style={{ borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
                              fontSize: 14, color: MUTED, backgroundColor: lock.backgroundColor }} />
                        </>
                      ) : null}
                      <Text style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>
                        {dp
                          ? `${rupee(pb.flat_price)} / ${pb.flat_area} sq.yd = ${rupee(pb.flat_rate)} per sq.yd${pb.terrace_area ? ` · terrace ${pb.terrace_area} sq.yd @ ${rupee(pb.terrace_rate)} = ${rupee(pb.terrace_price)}` : ''}`
                          : 'Regular plan — priced from the approved price book. Switch to Down Payment to change the rate or token.'}
                      </Text>
                    </View>
                  );
                })() : null}
                {pb.kind === 'shop' ? (() => {
                  const e = shopEdit(pb);
                  return (
                    <View style={{ borderWidth: 1.5, borderColor: '#C7D2FE', backgroundColor: '#F5F7FF', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: BLUE, letterSpacing: 0.5, marginBottom: 8 }}>
                        EDITABLE · EVERYTHING BELOW RECALCULATES
                      </Text>
                      <Fld l="Rate (Rs./sq.ft)" val={String(e.rate ?? '')} on={(t) => setShopEdit(pb, { rate: t })} kb="numeric" />
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4 }}>Total Unit Price</Text>
                      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        {[['pct', '%'], ['amount', 'Rs.']].map(([m, lbl]) => {
                          const on = e.mode === m;
                          return (
                            <TouchableOpacity key={m} onPress={() => setShopEdit(pb, { mode: m })}
                              style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5,
                                borderColor: on ? BLUE : COLORS.border, backgroundColor: on ? BLUE : COLORS.white }}>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: on ? '#fff' : MUTED }}>{lbl}</Text>
                            </TouchableOpacity>
                          );
                        })}
                        <View style={{ flex: 1 }}>
                          <TextInput keyboardType="numeric"
                            value={String((e.mode === 'amount' ? e.unitAmount : e.unitPct) ?? '')}
                            onChangeText={(t) => setShopEdit(pb, e.mode === 'amount' ? { unitAmount: t } : { unitPct: t })}
                            placeholderTextColor="#9CA3AF"
                            style={{ borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: TEXT, backgroundColor: COLORS.white }} />
                        </View>
                      </View>
                      <Text style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>
                        {e.mode === 'amount'
                          ? `Entered as an amount · ${pb.amount ? ((pb.loan_amount / pb.amount) * 100).toFixed(2) : '0'}% of the shop amount`
                          : `${e.unitPct || 0}% of ${rupee(pb.amount)} = ${rupee(pb.loan_amount)}`}
                      </Text>
                    </View>
                  );
                })() : null}
                <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, overflow: 'hidden' }}>
                  {pratRowsFor(pb).map((row, i) => (
                    Array.isArray(row) ? (
                      <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10,
                        paddingHorizontal: 12, paddingVertical: 9,
                        backgroundColor: row[2] === 'sub' ? '#EEF2FF' : (i % 2 ? '#FAFBFE' : COLORS.white),
                        borderBottomWidth: 1, borderBottomColor: '#F0F3FA' }}>
                        <Text style={{ fontSize: 12, color: row[2] === 'sub' ? TEXT : MUTED, fontWeight: row[2] === 'sub' ? '700' : '400', flexShrink: 1 }}>{row[0]}</Text>
                        <Text style={{ fontSize: 12, fontWeight: row[2] === 'sub' ? '800' : '700', color: TEXT }}>{row[1]}</Text>
                      </View>
                    ) : (
                      <View key={i} style={{ paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#F5F7FF',
                        borderBottomWidth: 1, borderBottomColor: '#E5EAF5' }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: BLUE }}>{row.h.toUpperCase()}</Text>
                      </View>
                    )
                  ))}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10,
                    paddingHorizontal: 12, paddingVertical: 12,
                    backgroundColor: pratBooks.length > 1 ? '#4B5563' : COLORS.navy }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff', flexShrink: 1 }}>
                      {pb.kind === 'shop' ? 'Grand Total' : 'Total'}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff' }}>{rupee(pbTotal(pb))}</Text>
                  </View>
                </View>
              </Sec>
            ))}
            {/* Only meaningful with more than one unit — a single unit's total is above. */}
            {pratBooks.length > 1 ? (
              <Sec title={`Combined Total · ${pratBooks.length} units`}>
                <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, overflow: 'hidden' }}>
                  {pratBooks.map((pb, i) => (
                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10,
                      paddingHorizontal: 12, paddingVertical: 9,
                      backgroundColor: i % 2 ? '#FAFBFE' : COLORS.white, borderBottomWidth: 1, borderBottomColor: '#F0F3FA' }}>
                      <Text style={{ fontSize: 12, color: MUTED }}>{unitTitle(pb)}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: TEXT }}>{rupee(pbTotal(pb))}</Text>
                    </View>
                  ))}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10,
                    paddingHorizontal: 12, paddingVertical: 12, backgroundColor: COLORS.navy }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff' }}>Total All Inclusive Amount</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff' }}>{rupee(pratTotal)}</Text>
                  </View>
                </View>
              </Sec>
            ) : null}
          </>
        ) : (<>
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
          {eoiMode && (project?.eoi_unit_types || []).length > 0 && (
            <>
              <Pick l="Unit Type" val={eoiType} on={(name) => {
                setEoiType(name);
                // Standard EOI sizes prefill Plot/Construction Area (× No. of Units, locked in EOI mode).
                applyEoiUnit(name, eoiUnits);
              }} opts={(project.eoi_unit_types || []).map((x) => x.type)} />
              <Fld l="No. of Units" val={eoiUnits} on={(u) => { setEoiUnits(u); applyEoiUnit(eoiType, u); }} kb="numeric" />
            </>
          )}
          <Fld l={`Plot Area (${unit})`} val={f.area} on={(t) => set('area', t)} kb="numeric" invalid={errs.area} />
          {flags.hasConstructionFields && <Fld l={`Construction Area (${unit})`} val={f.const_area} on={(t) => set('const_area', t)} kb="numeric" />}
          {flags.bunglowTypeIsDropdown && !eoiMode && <Pick l="Villa Type" val={f.villa_type} on={(x) => set('villa_type', x)} opts={['1BHK', '2BHK', '3BHK', '4BHK', 'Customized Villa']} />}
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
          {formulaSet === 'kalrav' && (
            <>
              {/* Kalrav: Unit Price = Land Sale Deed + Construction Agreement; % derived — both read-only. */}
              <View style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4 }}>Sale Deed %</Text>
                <TextInput value={v.saleDeedPct ? v.saleDeedPct.toFixed(2) : '0'} editable={false} style={[inpS, { backgroundColor: '#F3F4F6', color: MUTED }]} />
              </View>
              <View style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4 }}>Unit Price (₹)</Text>
                <TextInput value={String(Math.round(v.saleDeed) || 0)} editable={false} style={[inpS, { backgroundColor: '#F3F4F6', color: MUTED }]} />
              </View>
            </>
          )}
          {hasSaleDeedSplit && formulaSet !== 'kalrav' && (
            <>
              <Fld l="Sale Deed %" val={f.sale_deed_pct} on={(t) => setF((s) => ({ ...s, sale_deed_pct: t, sale_deed_amount: '' }))} kb="numeric" />
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
                    const base = v.plotBasic + v.plotDev + v.constAmt + v.premiumLocation;
                    // Keep the exact amount as source of truth; % is a rounded display.
                    setF((s) => ({ ...s, sale_deed_amount: t, sale_deed_pct: base > 0 ? String(parseFloat((amt / base * 100).toFixed(2))) : s.sale_deed_pct }));
                  }}
                  style={inpS}
                />
              </View>
            </>
          )}
          {!hasSaleDeedSplit && <Fld l="Discount (₹)" val={f.discount} on={(t) => set('discount', t)} kb="numeric" />}
        </Sec>

        <Sec title="Legal & Other Charges">
          {hasSaleDeedSplit && <Pick l="Apply Stamp Duty?" val={f.apply_stamp_duty} on={(x) => set('apply_stamp_duty', x)} opts={['Yes', 'No']} />}
          <Calc l="Stamp Duty" sub={stampSub} val={v.stampDuty} />
          <Pick l="Apply Registration Fee?" val={f.apply_reg_fee} on={(x) => set('apply_reg_fee', x)} opts={['Yes', 'No']} />
          <Pick l="Apply ₹1,500 Page Fee?" val={f.apply_page_fee} on={(x) => set('apply_page_fee', x)} opts={['Yes', 'No']} />
          <Calc l="Registration Fees" sub={regSub} val={v.regFees} />
          {hasSaleDeedSplit && <Pick l="Apply GST?" val={f.apply_gst} on={(x) => set('apply_gst', x)} opts={['Yes', 'No']} />}
          <Calc l="GST" sub={gstSub} val={v.gst} />
          <Fld l={`Maintenance Rate (₹/${unit}${formulaSet === 'industrial' ? '' : '/mo'})`} val={f.maint_rate} on={(t) => set('maint_rate', t)} kb="numeric" />
          {formulaSet !== 'industrial' && <Fld l="Maintenance Months" val={f.maint_months} on={(t) => set('maint_months', t)} kb="numeric" />}
          {(flags.hasMaintDeposit || v.isKalrav3) && <Calc l="Maintenance Deposit" sub={v.isKalrav3 ? '½ × Maintenance Amount' : maintSub} val={v.maintDeposit} />}
          {(flags.hasMaintAdvance || v.isKalrav3) && <Calc l="Maintenance Advance" sub={v.isKalrav3 ? '½ × Maintenance Amount' : maintSub} val={v.maintAdvance} />}
          <Calc l="Maintenance Amount" sub={(flags.hasMaintDeposit || flags.hasMaintAdvance || v.isKalrav3) ? '= Maintenance Deposit + Maintenance Advance' : maintSub} val={v.maint} />
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
          {flags.hasSaleDeed && formulaSet !== 'ankhol' && !hasSaleDeedSplit && <Tot l="Sale Deed" sub={saleDeedSub} sub2={saleDeedSub2} val={v.saleDeed} />}
          {hasSaleDeedSplit && <>
            <Tot l="Unit Price" sub={saleDeedSub} sub2={saleDeedSub2} val={v.saleDeed} />
            <Tot l="Extra Work Amount" val={v.nonSaleDeed} />
            <Fld l="Discount (₹)" val={f.discount} on={(t) => set('discount', t)} kb="numeric" />
            {v.discount > 0 && <Tot l="Final Extra Work Amount" sub="Extra Work Amount − Discount" val={v.nonSaleDeed - v.discount} />}
            <Tot l="Total Unit Price" sub={v.discount > 0 ? 'Unit Price + Final Extra Work Amount' : 'Unit Price + Extra Work Amount'} val={v.saleDeed + v.nonSaleDeed - v.discount} subtotal />
          </>}
          <Tot l="Legal & Other Charges" sub={extraSub} sub2={extraSub2} val={v.totalExtra} />
          {!!reviseId && v.extraWorkAmt > 0 && <Tot l="Extra Work" val={v.extraWorkAmt} />}
          {!hasSaleDeedSplit && <Tot l="Discount" val={-v.discount} />}
          <Tot l="Total Box Price" val={v.finalAmt} big />
        </View>
        </>)}

        <Sec title="Payment Schedule">
          <DateFld l="Booking Date *" val={f.booking_date} on={(t) => set('booking_date', t)} />
          {/* Pratishtha is an all-inclusive fixed box price — no staged payments. */}
          {pricingReady && (!prat || pratSched) && (<>
          {/* Extra Work Amount Installments — shown ABOVE the sale-deed installments */}
          {(hasSaleDeedSplit || pratShop) && nsdBase > 0 && (
            <View style={{ marginBottom: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 10 }}>
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
          {hasSaleDeedSplit && (
            <View style={{ marginBottom: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E3A5F' }}>{pratShop ? 'Final Unit Price Installments' : 'Unit Price Installments'}</Text>
              <Text style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{rupee(base)}</Text>
            </View>
          )}
          <Fld l="No. of Installments" val={insts.length ? String(insts.length) : ''} on={buildInsts} kb="numeric" />
          {insts.map((r, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center' }}>
              <Text style={{ width: 16, color: MUTED }}>{i + 1}</Text>
              <DateField value={r.date} onChange={(t) => setInst(i, 'date', t)} style={{ flex: 2 }} />
              <TextInput value={r.pct} onChangeText={(t) => setInst(i, 'pct', t)} placeholder="%" keyboardType="numeric" style={[inpS, { flex: 1 }]} />
              <TextInput value={r.amt} onChangeText={(t) => setInst(i, 'amt', t)} placeholder="₹" keyboardType="numeric" style={[inpS, { flex: 1.4 }]} />
            </View>
          ))}
          {/* Pratishtha's three charge lines all fall due on the sale deed or possession,
              so they carry that wording instead of a date picker. */}
          {pratSched ? pratExtras().map((x) => (
            <View key={x.label} style={{ marginTop: 6, backgroundColor: '#FFF8E1', borderRadius: 8, padding: 8 }}>
              <Text style={{ color: '#92400E', fontWeight: '700', fontSize: 12 }}>{x.label} {rupee(x.amt)}</Text>
              <Text style={{ color: MUTED, fontSize: 10, fontStyle: 'italic', marginTop: 2 }}>Date of Sale Deed or Possession (whichever is earlier)</Text>
            </View>
          )) : v.totalExtra > 0 && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, alignItems: 'center', backgroundColor: '#FFF8E1', borderRadius: 8, padding: 6 }}>
              <Text style={{ width: 16, color: '#92400E', fontWeight: '700', fontSize: 11 }}>Ex</Text>
              <DateField value={extraDate} onChange={setExtraDate} placeholder="Extra charges date" style={{ flex: 2 }} />
              <Text style={{ flex: 2.4, color: '#92400E', fontWeight: '700', fontSize: 12, textAlign: 'right' }}>Legal & Other Charges {rupee(v.totalExtra)}</Text>
            </View>
          )}
          {insts.length > 0 && <Text style={{ fontSize: 12, marginTop: 6, color: Math.abs(pctTotal - 100) < 0.01 ? COLORS.success : COLORS.error }}>Total {pctTotal.toFixed(2)}%</Text>}
          </>)}
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
          {!!savedLoiPath && !loiFile && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.successBg, borderWidth: 1, borderColor: '#86EFAC', borderRadius: 8, padding: 10, marginBottom: 10, gap: 8 }}>
              <Text style={{ color: COLORS.success, fontSize: 12, flex: 1 }}>📎 Signed LOI already attached from your last save.</Text>
              <TouchableOpacity onPress={() => openLoi(draftId || savedDraftId)}><Text style={{ color: COLORS.success, fontWeight: '700', fontSize: 12, textDecorationLine: 'underline' }}>View</Text></TouchableOpacity>
            </View>
          )}
          <TouchableOpacity onPress={genLoi} style={{ backgroundColor: '#7b2ff7', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>📄 Generate LOI (Download)</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={captureLoi} style={{ backgroundColor: COLORS.success, borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>📷 Capture signed LOI (multi-page → PDF)</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={pickLoi} style={{ borderWidth: 1.5, borderColor: BLUE, borderStyle: 'dashed', borderRadius: 10, padding: 14, alignItems: 'center' }}>
            <Text style={{ color: BLUE, fontWeight: '700', fontSize: 14 }}>📎 {loiFile ? loiFile.name : (savedLoiPath ? 'Attach a different signed LOI (replace)' : 'Attach signed LOI (image / PDF)')}</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>Generate → print/sign → capture pages or attach the signed copy → Submit.</Text>
        </Sec>

        {!!msg && (() => { const ok = msg.startsWith('✅') || msg.startsWith('📎'); return (
        <View style={{ padding: 12, borderRadius: 8, backgroundColor: ok ? COLORS.successBg : COLORS.errorBg, marginBottom: 12 }}>
          <Text style={{ color: ok ? COLORS.success : COLORS.error, fontSize: 13 }}>{msg}</Text>
        </View>); })()}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={saveDraft} disabled={saving || !projectId}
            style={{ flex: 1, backgroundColor: '#fff', borderWidth: 1.5, borderColor: COLORS.link, borderRadius: 12, paddingVertical: 15, alignItems: 'center', opacity: (saving || !projectId) ? 0.6 : 1 }}>
            {saving ? <ActivityIndicator color={COLORS.link} /> : <Text style={{ color: COLORS.link, fontWeight: '800', fontSize: 15 }}>💾 Save Draft</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={submit} disabled={saving} style={{ flex: 1, backgroundColor: COLORS.navy, borderRadius: 12, paddingVertical: 15, alignItems: 'center', opacity: saving ? 0.6 : 1 }}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Submit Booking</Text>}
          </TouchableOpacity>
        </View>
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
