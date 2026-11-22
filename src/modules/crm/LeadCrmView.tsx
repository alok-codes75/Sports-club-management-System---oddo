import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { Check, Search, Trash2, UserPlus } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '@/src/services/firebase';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  ENQUIRY_STAGE_LABELS,
  formatInr,
  SPORT_LABELS,
  TIER_ENTITLEMENTS,
  VALIDATION_BOUNDS,
  type Enquiry,
  type EnquiryStage,
} from '@/src/types/club';

const STAGES: EnquiryStage[] = ['new', 'contacted', 'quote_sent', 'converted', 'closed'];

interface LeadCrmViewProps {
  onConvertLead?: (lead: Enquiry) => void;
}

export function LeadCrmView({ onConvertLead }: LeadCrmViewProps) {
  const { profile } = useAuth();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState<EnquiryStage | 'all'>('all');
  const [searchText, setSearchText] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [editStage, setEditStage] = useState<EnquiryStage>('new');
  const [editQuote, setEditQuote] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'enquiries'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Enquiry, 'id'>),
        }));
        setEnquiries(items);
        setLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'enquiries')
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    return enquiries.filter((item) => {
      if (stageFilter !== 'all' && item.stage !== stageFilter) return false;
      if (!term) return true;
      return (
        item.visitorName.toLowerCase().includes(term) ||
        item.email.toLowerCase().includes(term) ||
        item.phone.toLowerCase().includes(term) ||
        item.referenceCode.toLowerCase().includes(term)
      );
    });
  }, [enquiries, stageFilter, searchText]);

  const selectedLead = useMemo(
    () => enquiries.find((e) => e.id === selectedId) ?? null,
    [enquiries, selectedId]
  );

  useEffect(() => {
    if (selectedLead) {
      setEditStage(selectedLead.stage);
      const suggested =
        selectedLead.quotedAmountInr ??
        (selectedLead.interestedTier !== 'undecided'
          ? TIER_ENTITLEMENTS[selectedLead.interestedTier].monthlyPriceInr
          : 2499);
      setEditQuote(String(suggested));
      setEditNotes(selectedLead.staffNotes ?? '');
      setSaveToast(null);
    }
  }, [selectedLead]);

  const metrics = useMemo(() => {
    return {
      total: enquiries.length,
      newCount: enquiries.filter((e) => e.stage === 'new').length,
      trials: enquiries.filter((e) => e.enquiryType === 'trial').length,
      quotes: enquiries.filter((e) => e.stage === 'quote_sent' || e.stage === 'converted').length,
    };
  }, [enquiries]);

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    setSaving(true);
    setSaveToast(null);

    const parsedQuote = Number(editQuote);
    const updates: Record<string, unknown> = {
      stage: editStage,
      staffNotes: editNotes.trim().slice(0, VALIDATION_BOUNDS.staffNotesMax),
      updatedAt: serverTimestamp(),
    };
    if (!Number.isNaN(parsedQuote) && parsedQuote >= 0 && parsedQuote <= 1000000) {
      updates.quotedAmountInr = parsedQuote;
    }

    try {
      await updateDoc(doc(db, 'enquiries', selectedLead.id), updates);
      setSaveToast('Lead pipeline updated in Firestore.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `enquiries/${selectedLead.id}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLead = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'enquiries', id));
      if (selectedId === id) setSelectedId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `enquiries/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Total Enquiries</div>
          <div className="font-mono text-2xl font-semibold tabular-nums text-slate-900 mt-1">
            {metrics.total}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Awaiting First Contact</div>
          <div className="font-mono text-2xl font-semibold tabular-nums text-amber-700 mt-1">
            {metrics.newCount}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Trial Session Requests</div>
          <div className="font-mono text-2xl font-semibold tabular-nums text-blue-700 mt-1">
            {metrics.trials}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs text-slate-500">Quoted / Converted</div>
          <div className="font-mono text-2xl font-semibold tabular-nums text-emerald-700 mt-1">
            {metrics.quotes}
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setStageFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              stageFilter === 'all'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Leads
          </button>
          {STAGES.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStageFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                stageFilter === st
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {ENQUIRY_STAGE_LABELS[st]}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search name, phone, ref..."
            className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>
      </div>

      {/* Split Master-Detail Pipeline */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              <div className="h-10 bg-slate-100 rounded animate-pulse" />
              <div className="h-10 bg-slate-100 rounded animate-pulse" />
              <div className="h-10 bg-slate-100 rounded animate-pulse" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-semibold text-slate-900 mb-1">No enquiries match this filter</p>
              <p className="text-xs text-slate-500">
                Submit a Trial Session or Enquiry on the Public Website to see leads stream live here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                    <th className="py-2.5 px-4 font-semibold">Visitor & Ref</th>
                    <th className="py-2.5 px-4 font-semibold">Interest</th>
                    <th className="py-2.5 px-4 font-semibold">Stage</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Quote</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filtered.map((lead) => {
                    const isSelected = lead.id === selectedId;
                    return (
                      <tr
                        key={lead.id}
                        onClick={() => setSelectedId(lead.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{lead.visitorName}</div>
                          <div className="text-xs text-slate-500 font-mono">
                            {lead.referenceCode} · {lead.phone}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          <div>
                            {lead.enquiryType === 'trial' ? 'Trial Session' : 'Membership Enquiry'}
                          </div>
                          <div className="text-slate-500">
                            {lead.interestedSport === 'all'
                              ? 'All Sports'
                              : SPORT_LABELS[lead.interestedSport]}{' '}
                            · {lead.interestedTier}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold">
                          <span
                            className={
                              lead.stage === 'new'
                                ? 'text-amber-700'
                                : lead.stage === 'converted'
                                ? 'text-emerald-700'
                                : lead.stage === 'quote_sent'
                                ? 'text-blue-700'
                                : 'text-slate-600'
                            }
                          >
                            {ENQUIRY_STAGE_LABELS[lead.stage]}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs tabular-nums text-slate-900">
                          {lead.quotedAmountInr !== undefined ? formatInr(lead.quotedAmountInr) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Lead Action & Quote Panel */}
        <div className="xl:col-span-5 bg-white border border-slate-200 rounded-xl p-6">
          {!selectedLead ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Select a visitor enquiry from the table to inspect details, send an INR quote, or log
              follow-up notes.
            </div>
          ) : (
            <form onSubmit={handleSaveLead} className="space-y-4">
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <div className="text-xs font-mono text-slate-500">
                    {selectedLead.referenceCode} ·{' '}
                    {selectedLead.enquiryType === 'trial' ? 'Trial Request' : 'Enquiry'}
                  </div>
                  <h3 className="font-display text-2xl font-bold text-slate-900 mt-0.5">
                    {selectedLead.visitorName}
                  </h3>
                  <div className="text-xs text-slate-600 mt-1">
                    {selectedLead.email} · <span className="font-mono">{selectedLead.phone}</span>
                  </div>
                </div>
                {profile?.role === 'owner' && (
                  <button
                    type="button"
                    onClick={() => void handleDeleteLead(selectedLead.id)}
                    title="Delete lead"
                    className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {selectedLead.preferredDate && (
                <div className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5">
                  Requested Trial Slot:{' '}
                  <span className="font-mono font-semibold">
                    {selectedLead.preferredDate} at {selectedLead.preferredSlot}
                  </span>
                </div>
              )}

              {selectedLead.message && (
                <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5">
                  <span className="font-semibold text-slate-800 block mb-0.5">Visitor Note</span>
                  {selectedLead.message}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Pipeline Stage
                  </label>
                  <select
                    value={editStage}
                    onChange={(e) => setEditStage(e.target.value as EnquiryStage)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {STAGES.map((st) => (
                      <option key={st} value={st}>
                        {ENQUIRY_STAGE_LABELS[st]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Quoted Membership / Trial (INR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={1000000}
                    value={editQuote}
                    onChange={(e) => setEditQuote(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Staff Follow-Up Notes
                </label>
                <textarea
                  rows={3}
                  maxLength={VALIDATION_BOUNDS.staffNotesMax}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Record phone call outcome, quote sent via WhatsApp/email, or trial attendance..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {saveToast && (
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">
                  <Check className="w-4 h-4" />
                  <span>{saveToast}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                {onConvertLead && selectedLead.stage !== 'converted' && (
                  <button
                    type="button"
                    onClick={() => onConvertLead(selectedLead)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <UserPlus className="w-4 h-4" />
                    Convert to Member
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap"
                >
                  {saving ? 'Saving...' : 'Update Lead & Quote'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
