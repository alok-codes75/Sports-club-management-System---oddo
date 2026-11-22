import React, { useState } from 'react';
import { motion } from 'motion/react';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { CheckCircle2, Clock, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '@/src/services/firebase';
import {
  VALIDATION_BOUNDS,
  type MembershipTier,
  type SportType,
} from '@/src/types/club';
import { addOneHour, formatInr, HALF_HOUR_START_SLOTS } from '@/src/utils/clubHelpers';

interface EnquiryFormSectionProps {
  sevenDays: { dateKey: string; dayLabel: string; dateNum: string; isFriday: boolean }[];
  enquiryTab: 'trial' | 'enquiry';
  onChangeTab: (tab: 'trial' | 'enquiry') => void;
  interestedSport: SportType | 'all';
  onChangeSport: (sport: SportType | 'all') => void;
  interestedTier: MembershipTier | 'undecided';
  onChangeTier: (tier: MembershipTier | 'undecided') => void;
  preferredDate: string;
  onChangeDate: (dateKey: string) => void;
  preferredSlot: string;
  onChangeSlot: (slot: string) => void;
  submittedRef: string | null;
  onSetSubmittedRef: (ref: string | null) => void;
}

export function EnquiryFormSection({
  sevenDays,
  enquiryTab,
  onChangeTab,
  interestedSport,
  onChangeSport,
  interestedTier,
  onChangeTier,
  preferredDate,
  onChangeDate,
  preferredSlot,
  onChangeSlot,
  submittedRef,
  onSetSubmittedRef,
}: EnquiryFormSectionProps) {
  const [visitorName, setVisitorName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = visitorName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedMessage = message.trim();

    if (trimmedName.length < 2 || trimmedName.length > VALIDATION_BOUNDS.visitorNameMax) {
      setFormError('Please enter your full name (2–100 characters).');
      return;
    }
    if (
      !VALIDATION_BOUNDS.emailPattern.test(trimmedEmail) ||
      trimmedEmail.length > VALIDATION_BOUNDS.emailMax
    ) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (
      trimmedPhone.length < VALIDATION_BOUNDS.phoneMin ||
      trimmedPhone.length > VALIDATION_BOUNDS.phoneMax ||
      !VALIDATION_BOUNDS.phonePattern.test(trimmedPhone)
    ) {
      setFormError('Please enter a valid 10-digit Indian mobile number (e.g. +91 98765 43210).');
      return;
    }
    if (trimmedMessage.length > VALIDATION_BOUNDS.messageMax) {
      setFormError(`Notes must be under ${VALIDATION_BOUNDS.messageMax} characters.`);
      return;
    }

    setSubmitting(true);
    const prefix = enquiryTab === 'trial' ? 'TRL' : 'ENQ';
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const referenceCode = `${prefix}-${randomNum}`;
    const docId = `${prefix.toLowerCase()}-${Date.now()}-${randomNum}`;

    try {
      const payload: Record<string, unknown> = {
        referenceCode,
        enquiryType: enquiryTab,
        visitorName: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        interestedSport,
        interestedTier,
        stage: 'new',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (enquiryTab === 'trial') {
        payload.preferredDate = preferredDate;
        payload.preferredSlot = preferredSlot;
      }
      if (trimmedMessage) {
        payload.message = trimmedMessage;
      }

      await setDoc(doc(db, 'enquiries', docId), payload);
      onSetSubmittedRef(referenceCode);
      setVisitorName('');
      setEmail('');
      setPhone('');
      setMessage('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `enquiries/${docId}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="enquire" className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.3 }}
          className="lg:col-span-5"
        >
          <p className="text-xs font-semibold text-blue-700 mb-2">Direct Front Desk Connection</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-4">
            Book a Trial Session or Request a Membership Quote
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            Every submission enters our Front Desk CRM immediately with a unique tracking code. Our
            staff review your preferred court slot or plan, follow up by phone, send an itemized INR
            quote, and convert you to a member seamlessly.
          </p>
          <div className="space-y-3 text-sm text-slate-700 border-t border-slate-200 pt-6">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-blue-700 shrink-0" />
              <span>Average front desk response time under 30 minutes during club hours.</span>
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
              <span>No advance payment required to lock your trial court request.</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-blue-700 shrink-0" />
              <span>Sector 34 Sports Avenue, Chandigarh, Punjab · Free member parking.</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-blue-700 shrink-0" />
              <span>Walk-ins welcome daily · 06:00 to 22:00 · Front Desk +91 172 460 8900.</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.34, delay: 0.06 }}
          className="lg:col-span-7 bg-white border border-slate-200 hover:border-blue-200 rounded-2xl p-5 sm:p-8 shadow-sm hover:shadow-md transition-all duration-200"
        >
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg mb-6 w-fit max-w-full">
            {(
              [
                { id: 'trial', label: 'Book Trial Session' },
                { id: 'enquiry', label: 'Membership & Club Enquiry' },
              ] as const
            ).map((tab) => {
              const active = enquiryTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    onChangeTab(tab.id);
                    onSetSubmittedRef(null);
                  }}
                  className={`relative px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    active ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="enquiry-form-tab"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      className="absolute inset-0 bg-white rounded-md shadow-sm"
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {submittedRef ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              className="bg-emerald-50 border border-emerald-200 rounded-xl p-6"
            >
              <div className="flex items-center gap-2.5 text-emerald-800 font-semibold mb-2">
                <CheckCircle2 className="w-5 h-5" />
                <span>
                  {enquiryTab === 'trial'
                    ? 'Trial Session Request Received'
                    : 'Club Enquiry Logged With Front Desk'}
                </span>
              </div>
              <p className="text-sm text-emerald-900 mb-3">
                Your request is now live in the Udaan Sports Club Front Desk pipeline. Quote this
                reference if you call or walk in:
              </p>
              <div className="font-mono text-lg font-semibold text-emerald-950 bg-white border border-emerald-200 inline-block px-3 py-1.5 rounded-md mb-4">
                {submittedRef}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => onSetSubmittedRef(null)}
                  className="text-xs font-semibold text-emerald-800 underline"
                >
                  Submit another request
                </button>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3.5 py-2.5 rounded-lg">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={VALIDATION_BOUNDS.visitorNameMax}
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    placeholder="e.g. Rohan Mehta"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={VALIDATION_BOUNDS.phoneMax}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    maxLength={VALIDATION_BOUNDS.emailMax}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rohan@example.com"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Primary Sport
                  </label>
                  <select
                    value={interestedSport}
                    onChange={(e) => onChangeSport(e.target.value as SportType | 'all')}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="tennis">Tennis</option>
                    <option value="cricket">Cricket</option>
                    <option value="padel">Padel</option>
                    <option value="badminton">Badminton</option>
                    <option value="all">All Four Sports</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Membership Interest
                  </label>
                  <select
                    value={interestedTier}
                    onChange={(e) => onChangeTier(e.target.value as MembershipTier | 'undecided')}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="gold">Gold ({formatInr(4999)}/mo)</option>
                    <option value="silver">Silver ({formatInr(2499)}/mo)</option>
                    <option value="junior">Junior &lt;18 ({formatInr(1499)}/mo)</option>
                    <option value="undecided">Decide after trial</option>
                  </select>
                </div>

                {enquiryTab === 'trial' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Preferred Date
                      </label>
                      <select
                        value={preferredDate}
                        onChange={(e) => onChangeDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        {sevenDays.map((d) => (
                          <option key={d.dateKey} value={d.dateKey}>
                            {d.dayLabel} ({d.dateNum})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Preferred Slot (1 Hr)
                      </label>
                      <select
                        value={preferredSlot}
                        onChange={(e) => onChangeSlot(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        {HALF_HOUR_START_SLOTS.map((slot) => (
                          <option key={slot} value={slot}>
                            {slot}–{addOneHour(slot)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Notes or Questions (optional)
                </label>
                <textarea
                  rows={3}
                  maxLength={VALIDATION_BOUNDS.messageMax}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    enquiryTab === 'trial'
                      ? 'Need a demo racket, coaching intro, or corporate group trial?'
                      : 'Ask about family plans, junior coaching batches, or corporate memberships.'
                  }
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <span className="text-xs text-slate-500">
                  Protected under Udaan Sports Club privacy policy
                </span>
                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 hover:shadow-md hover:shadow-blue-700/20 disabled:opacity-60 rounded-lg transition-all duration-200 whitespace-nowrap self-start sm:self-auto"
                >
                  {submitting
                    ? 'Submitting...'
                    : enquiryTab === 'trial'
                    ? 'Confirm Trial Request'
                    : 'Send Enquiry'}
                </motion.button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
