import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, CalendarX2, X } from 'lucide-react';
import {
  SPORT_LABELS,
  VALIDATION_BOUNDS,
  type Booking,
} from '@/src/types/club';
import { formatInr } from '@/src/utils/clubHelpers';

const QUICK_REASONS = [
  'Change of plans',
  'Weather / Rain',
  'Injury or health',
  'Personal emergency',
  'Rescheduling to another slot',
] as const;

interface CancelBookingModalProps {
  booking: Booking;
  busy: boolean;
  isStaff?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function CancelBookingModal({
  booking,
  busy,
  isStaff = false,
  onClose,
  onConfirm,
}: CancelBookingModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [customNote, setCustomNote] = useState('');

  const resolvedReason = customNote.trim() || selectedPreset;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm(resolvedReason);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 pb-4 mb-4 border-b border-slate-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center shrink-0">
              <CalendarX2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-red-600">
                Cancel Court Reservation
              </div>
              <h3 className="font-display text-2xl font-bold text-slate-900 leading-tight">
                {booking.courtName}
              </h3>
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label="Close cancellation dialog"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">Sport &amp; Court</span>
              <span className="font-semibold text-slate-900">
                {SPORT_LABELS[booking.sport]} · {booking.courtName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Date &amp; Time</span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {booking.date} · {booking.startTime}–{booking.endTime}
              </span>
            </div>
            {isStaff && (
              <div className="flex justify-between">
                <span className="text-slate-600">Booked For</span>
                <span className="font-semibold text-slate-900">{booking.playerName}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-slate-200">
              <span className="text-slate-600">Slot Fee</span>
              <span className="font-mono font-semibold text-slate-900">
                {booking.finalAmountInr === 0 ? '₹0 (Included)' : formatInr(booking.finalAmountInr)}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 text-xs leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Cancelling immediately frees both 30-minute court locks so other members can book this
              slot right away, and restores your daily play quota for {booking.date}.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Reason for cancellation (optional)
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {QUICK_REASONS.map((preset) => {
                const active = selectedPreset === preset && !customNote.trim();
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(preset === selectedPreset ? '' : preset);
                      setCustomNote('');
                    }}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      active
                        ? 'bg-red-50 border-red-400 text-red-700 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              maxLength={VALIDATION_BOUNDS.cancellationReasonMax}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Or type a short reason (optional)..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Keep Booking
            </button>
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-lg transition-colors"
            >
              {busy ? 'Freeing Court Slot...' : 'Confirm Cancel & Free Slot'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
