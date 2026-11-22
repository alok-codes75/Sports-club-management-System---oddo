import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Calendar } from 'lucide-react';
import {
  SPORT_LABELS,
  type Court,
  type PublicScheduleSlot,
  type SportType,
} from '@/src/types/club';
import {
  addOneHour,
  formatInr,
  HALF_HOUR_START_SLOTS,
  slotsOverlap,
} from '@/src/utils/clubHelpers';

export type DayPeriod = 'morning' | 'afternoon' | 'evening';

const PERIOD_SLOTS: Record<DayPeriod, string[]> = {
  morning: HALF_HOUR_START_SLOTS.filter((t) => t >= '06:00' && t < '12:00'),
  afternoon: HALF_HOUR_START_SLOTS.filter((t) => t >= '12:00' && t < '17:00'),
  evening: HALF_HOUR_START_SLOTS.filter((t) => t >= '17:00' && t <= '21:00'),
};

interface LiveCourtsSectionProps {
  courts: Court[];
  scheduleSlots: PublicScheduleSlot[];
  loading: boolean;
  sevenDays: { dateKey: string; dayLabel: string; dateNum: string; isFriday: boolean }[];
  selectedDate: string;
  onSelectDate: (dateKey: string) => void;
  selectedSport: SportType | 'all';
  onSelectSport: (sport: SportType | 'all') => void;
  selectedPeriod: DayPeriod;
  onSelectPeriod: (period: DayPeriod) => void;
  onSelectSlotForTrial: (sport: SportType, slot: string) => void;
  onOpenAdminLogin: () => void;
}

export function LiveCourtsSection({
  courts,
  scheduleSlots,
  loading,
  sevenDays,
  selectedDate,
  onSelectDate,
  selectedSport,
  onSelectSport,
  selectedPeriod,
  onSelectPeriod,
  onSelectSlotForTrial,
  onOpenAdminLogin,
}: LiveCourtsSectionProps) {
  const filteredCourts = useMemo(() => {
    if (selectedSport === 'all') return courts;
    return courts.filter((c) => c.sport === selectedSport);
  }, [courts, selectedSport]);

  const visibleSlots = PERIOD_SLOTS[selectedPeriod];

  const getSlotStatus = (courtId: string, startTime: string): 'available' | 'booked' | 'social' => {
    const endTime = addOneHour(startTime);
    const match = scheduleSlots.find(
      (s) => s.courtId === courtId && slotsOverlap(startTime, endTime, s.startTime, s.endTime)
    );
    if (!match) return 'available';
    return match.slotType === 'social' ? 'social' : 'booked';
  };

  return (
    <section id="courts" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 border-b border-slate-200">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8"
      >
        <div>
          <p className="text-xs font-semibold text-blue-700 mb-1.5">Live Weekly Schedule</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            See What Courts Are Free This Week
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Click any open 1-hour slot to book a Trial Session, or sign into the Member Portal to
            lock the court immediately.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
          {(['all', 'tennis', 'cricket', 'padel', 'badminton'] as const).map((sp) => {
            const active = selectedSport === sp;
            return (
              <button
                key={sp}
                type="button"
                onClick={() => onSelectSport(sp)}
                className={`relative px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  active ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="live-courts-sport-tab"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 bg-white rounded-md shadow-sm"
                  />
                )}
                <span className="relative z-10">
                  {sp === 'all' ? 'All Sports' : SPORT_LABELS[sp]}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div className="flex overflow-x-auto pb-1 sm:pb-0 snap-x snap-mandatory sm:grid sm:grid-cols-7 gap-2 flex-1">
          {sevenDays.map((d) => {
            const active = selectedDate === d.dateKey;
            return (
              <motion.button
                key={d.dateKey}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.14 }}
                onClick={() => onSelectDate(d.dateKey)}
                className={`min-w-[104px] sm:min-w-0 shrink-0 snap-start px-3 py-2.5 rounded-lg border text-left transition-all duration-150 ${
                  active
                    ? 'bg-blue-700 text-white border-blue-700 shadow-sm shadow-blue-700/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/40'
                }`}
              >
                <div className={`text-xs ${active ? 'text-blue-100' : 'text-slate-500'}`}>
                  {d.dayLabel}
                  {d.isFriday ? ' · Social' : ''}
                </div>
                <div className="font-mono text-sm font-semibold tabular-nums mt-0.5">
                  {d.dateNum}
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0 self-start overflow-x-auto max-w-full">
          {(
            [
              { id: 'morning', label: 'Morning 06–12' },
              { id: 'afternoon', label: 'Day 12–17' },
              { id: 'evening', label: 'Evening 17–21' },
            ] as const
          ).map((p) => {
            const active = selectedPeriod === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPeriod(p.id)}
                className={`relative px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  active ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="live-courts-period-tab"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 bg-white rounded-md shadow-sm"
                  />
                )}
                <span className="relative z-10">{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="border border-slate-200 rounded-xl p-8 space-y-3">
          <div className="h-10 bg-slate-100 rounded animate-pulse" />
          <div className="h-10 bg-slate-100 rounded animate-pulse" />
          <div className="h-10 bg-slate-100 rounded animate-pulse" />
        </div>
      ) : filteredCourts.length === 0 ? (
        <div className="border border-slate-200 rounded-xl p-10 text-center bg-slate-50">
          <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h3 className="font-display text-2xl font-bold text-slate-900 mb-1">
            Court Schedule Ready for Setup
          </h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto mb-5">
            Sign into the Admin &amp; Staff Login portal as the Club Owner to initialize all 8
            courts, pro gear stock, bar menu, and sample operations data.
          </p>
          <button
            type="button"
            onClick={onOpenAdminLogin}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
          >
            Open Admin Login to Seed Database
          </button>
        </div>
      ) : (
        <motion.div
          key={`${selectedDate}-${selectedSport}-${selectedPeriod}`}
          initial={{ opacity: 0.65, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="border border-slate-200 rounded-xl overflow-x-auto bg-white shadow-xs"
        >
          <table className="w-full text-left border-collapse min-w-[820px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
                <th className="py-3 px-4 font-semibold w-56">Court &amp; Walk-In Rate</th>
                {visibleSlots.map((slot) => (
                  <th key={slot} className="py-3 px-2 font-mono font-medium text-center tabular-nums">
                    {slot}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filteredCourts.map((court) => (
                <tr key={court.id} className="hover:bg-blue-50/35 transition-colors duration-150">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{court.name}</div>
                    <div className="text-xs text-slate-500">
                      {SPORT_LABELS[court.sport]} · {court.indoor ? 'Indoor' : 'Outdoor'} ·{' '}
                      <span className="font-mono tabular-nums text-slate-700">
                        {formatInr(court.hourlyRateInr)}/hr
                      </span>
                    </div>
                  </td>
                  {visibleSlots.map((slot) => {
                    const status = getSlotStatus(court.id, slot);
                    if (status === 'booked') {
                      return (
                        <td key={slot} className="p-1.5 text-center">
                          <div
                            title="Already booked"
                            className="h-9 rounded bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-400 flex items-center justify-center"
                          >
                            Booked
                          </div>
                        </td>
                      );
                    }
                    if (status === 'social') {
                      return (
                        <td key={slot} className="p-1.5 text-center">
                          <a
                            href="#social"
                            className="h-9 rounded bg-lime-100 border border-lime-300 text-[11px] font-semibold text-lime-900 flex items-center justify-center hover:bg-lime-300 hover:-translate-y-0.5 hover:shadow-xs transition-all duration-150"
                          >
                            Social
                          </a>
                        </td>
                      );
                    }
                    return (
                      <td key={slot} className="p-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => onSelectSlotForTrial(court.sport, slot)}
                          title={`Request trial on ${court.name} at ${slot}–${addOneHour(slot)}`}
                          className="w-full h-9 rounded bg-white border border-slate-200 hover:border-blue-700 hover:bg-blue-700 hover:text-white hover:-translate-y-0.5 hover:shadow-sm active:scale-95 text-[11px] font-semibold text-blue-700 transition-all duration-150"
                        >
                          Open
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </section>
  );
}
