import { TIER_ENTITLEMENTS, type MemberStatus, type PlayerTier } from '@/src/types/club';

export const HALF_HOUR_START_SLOTS: string[] = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30',
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  '21:00',
];

export function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return getDateKey(dt);
}

export function computeMemberExpiryStatus(expiryDate: string): MemberStatus {
  const today = getDateKey(new Date());
  if (expiryDate < today) return 'expired';
  const warnLimit = addDaysToDateKey(today, 14);
  if (expiryDate <= warnLimit) return 'expiring_soon';
  return 'active';
}

export function calculateAgeYears(dob: string): number {
  const [y, m, d] = dob.split('-').map(Number);
  const today = new Date();
  let age = today.getFullYear() - y;
  const monthDiff = today.getMonth() + 1 - m;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d)) {
    age -= 1;
  }
  return age;
}

export function getNextSevenDays(): {
  dateKey: string;
  dayLabel: string;
  dateNum: string;
  isFriday: boolean;
}[] {
  const days: { dateKey: string; dayLabel: string; dateNum: string; isFriday: boolean }[] = [];
  const base = new Date();
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    days.push({
      dateKey: getDateKey(d),
      dayLabel: i === 0 ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short' }),
      dateNum: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      isFriday: d.getDay() === 5,
    });
  }
  return days;
}

export function getNextFridayDateKey(): string {
  const d = new Date();
  const diff = (5 - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return getDateKey(d);
}

export function addMinutes(startTime: string, mins: number): string {
  const [h, m] = startTime.split(':').map(Number);
  const total = h * 60 + m + mins;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

export function addOneHour(startTime: string): string {
  return addMinutes(startTime, 60);
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function slotsOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const a1 = timeToMinutes(startA);
  const a2 = timeToMinutes(endA);
  const b1 = timeToMinutes(startB);
  const b2 = timeToMinutes(endB);
  return a1 < b2 && b1 < a2;
}

export function getCourtPriceForTier(
  baseRateInr: number,
  tier: PlayerTier
): { discountInr: number; finalAmountInr: number } {
  if (tier === 'walk_in') {
    return { discountInr: 0, finalAmountInr: baseRateInr };
  }
  const pct = TIER_ENTITLEMENTS[tier].courtDiscountPercent;
  const discountInr = Math.round((baseRateInr * pct) / 100);
  return { discountInr, finalAmountInr: Math.max(0, baseRateInr - discountInr) };
}

export function getShopDiscountPercent(tier: PlayerTier): number {
  if (tier === 'walk_in') return 0;
  return TIER_ENTITLEMENTS[tier].shopDiscountPercent;
}

export function getBarDiscountPercent(tier: PlayerTier): number {
  if (tier === 'walk_in') return 0;
  return TIER_ENTITLEMENTS[tier].barDiscountPercent;
}
