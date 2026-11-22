import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'owner' | 'front_desk' | 'bar_staff' | 'member';
export type MembershipTier = 'gold' | 'silver' | 'junior';
export type PlayerTier = MembershipTier | 'walk_in';
export type MemberStatus = 'active' | 'expiring_soon' | 'expired' | 'suspended';
export type SportType = 'tennis' | 'cricket' | 'padel' | 'badminton';
export type EnquiryStage = 'new' | 'contacted' | 'quote_sent' | 'converted' | 'closed';
export type ProductCategory = 'rackets' | 'balls' | 'shoes' | 'accessories' | 'apparel';
export type PaymentMethod = 'upi' | 'card' | 'cash';
export type BookingPaymentMethod = PaymentMethod | 'included';
export type MenuCategory = 'drinks' | 'coffee' | 'snacks' | 'meals';
export type KitchenStatus = 'queued' | 'preparing' | 'ready' | 'served';
export type TabStatus = 'open' | 'settled' | 'voided';
export type ShopOrderStatus = 'confirmed' | 'ready_for_pickup' | 'dispatched' | 'completed' | 'cancelled';
export type TransactionSource = 'court' | 'shop' | 'bar' | 'membership' | 'corporate';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';
export type StaffDepartment = 'front_desk' | 'bar_kitchen' | 'coaching' | 'maintenance' | 'management';

export const BOOTSTRAPPED_OWNER_EMAIL = 'sahprince4554@gmail.com';

export const VALIDATION_BOUNDS = {
  idPattern: /^[a-zA-Z0-9_-]+$/,
  phonePattern: /^[0-9+\-\s]+$/,
  emailPattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  visitorNameMax: 100,
  emailMax: 160,
  phoneMin: 10,
  phoneMax: 20,
  messageMax: 600,
  staffNotesMax: 600,
  cancellationReasonMax: 200,
} as const;

export interface TierEntitlement {
  id: MembershipTier;
  name: string;
  tagline: string;
  monthlyPriceInr: number;
  annualPriceInr: number;
  courtDiscountPercent: number;
  shopDiscountPercent: number;
  barDiscountPercent: number;
  maxSessionsPerDay: number;
  socialPlayFeeInr: number;
  eligibility: string;
}

export const TIER_ENTITLEMENTS: Record<MembershipTier, TierEntitlement> = {
  gold: {
    id: 'gold',
    name: 'Gold',
    tagline: 'For frequent players seeking unlimited peak access',
    monthlyPriceInr: 4999,
    annualPriceInr: 52000,
    courtDiscountPercent: 100,
    shopDiscountPercent: 20,
    barDiscountPercent: 15,
    maxSessionsPerDay: 2,
    socialPlayFeeInr: 0,
    eligibility: 'All ages · Full priority booking (7 days ahead)',
  },
  silver: {
    id: 'silver',
    name: 'Silver',
    tagline: 'For regular weekly players across all four sports',
    monthlyPriceInr: 2499,
    annualPriceInr: 26500,
    courtDiscountPercent: 50,
    shopDiscountPercent: 10,
    barDiscountPercent: 10,
    maxSessionsPerDay: 2,
    socialPlayFeeInr: 150,
    eligibility: 'Ages 18+ · Standard booking (5 days ahead)',
  },
  junior: {
    id: 'junior',
    name: 'Junior',
    tagline: 'For athletes under 18 building competitive match play',
    monthlyPriceInr: 1499,
    annualPriceInr: 15500,
    courtDiscountPercent: 60,
    shopDiscountPercent: 15,
    barDiscountPercent: 10,
    maxSessionsPerDay: 2,
    socialPlayFeeInr: 100,
    eligibility: 'Strictly under 18 · DOB verification required',
  },
};

export const SPORT_LABELS: Record<SportType, string> = {
  tennis: 'Tennis',
  cricket: 'Cricket',
  padel: 'Padel',
  badminton: 'Badminton',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Club Owner',
  front_desk: 'Front Desk Staff',
  bar_staff: 'Bar & Kitchen Staff',
  member: 'Club Member',
};

export const ENQUIRY_STAGE_LABELS: Record<EnquiryStage, string> = {
  new: 'New Lead',
  contacted: 'Follow-Up',
  quote_sent: 'Quote Sent',
  converted: 'Converted',
  closed: 'Closed',
};

export const DEPARTMENT_LABELS: Record<StaffDepartment, string> = {
  front_desk: 'Front Desk',
  bar_kitchen: 'Bar & Kitchen',
  coaching: 'Coaching',
  maintenance: 'Court Maintenance',
  management: 'Management',
};

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  linkedMemberId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Member {
  id: string;
  memberCode: string;
  fullName: string;
  email: string;
  phone: string;
  dob?: string;
  tier: MembershipTier;
  status: MemberStatus;
  startDate: string;
  expiryDate: string;
  userId?: string;
  totalSpentInr: number;
  visitsCount: number;
  notes?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Court {
  id: string;
  name: string;
  sport: SportType;
  surface: string;
  indoor: boolean;
  hourlyRateInr: number;
  active: boolean;
  notes?: string;
  updatedAt?: Timestamp;
}

export interface PublicScheduleSlot {
  id: string;
  courtId: string;
  courtName: string;
  sport: SportType;
  date: string;
  startTime: string;
  endTime: string;
  slotType: 'booking' | 'social';
  status: 'occupied' | 'social_open' | 'cancelled';
  spotsFilled?: number;
  maxSpots?: number;
  updatedAt?: Timestamp;
}

export interface Booking {
  id: string;
  courtId: string;
  courtName: string;
  sport: SportType;
  date: string;
  startTime: string;
  endTime: string;
  memberId?: string;
  userId: string;
  playerName: string;
  playerPhone?: string;
  tier: PlayerTier;
  baseRateInr: number;
  discountInr: number;
  finalAmountInr: number;
  paymentMethod: BookingPaymentMethod;
  status: 'confirmed' | 'cancelled' | 'completed';
  cancellationReason?: string;
  lockIds: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SocialSession {
  id: string;
  title: string;
  courtId: string;
  courtName: string;
  sport: SportType;
  date: string;
  startTime: string;
  endTime: string;
  feeInr: number;
  maxPlayers: number;
  spotsFilled: number;
  status: 'open' | 'full' | 'completed' | 'cancelled';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SocialParticipant {
  id: string;
  sessionId: string;
  userId: string;
  playerName: string;
  tier: PlayerTier;
  paidInr: number;
  paymentMethod: BookingPaymentMethod;
  createdAt?: Timestamp;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  brand: string;
  priceInr: number;
  stock: number;
  lowStockThreshold: number;
  description?: string;
  active: boolean;
  updatedAt?: Timestamp;
}

export interface OrderLineItem {
  productId: string;
  sku?: string;
  name: string;
  unitPriceInr: number;
  quantity: number;
  lineTotalInr: number;
}

export interface ShopOrder {
  id: string;
  orderCode: string;
  userId: string;
  memberId?: string;
  customerName: string;
  tier: PlayerTier;
  channel: 'counter' | 'online';
  fulfillment: 'counter_pickup' | 'club_collect' | 'delivery';
  deliveryAddress?: string;
  items: OrderLineItem[];
  subtotalInr: number;
  discountInr: number;
  gstInr: number;
  totalInr: number;
  paymentMethod: PaymentMethod;
  status: ShopOrderStatus;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory;
  priceInr: number;
  prepMins: number;
  available: boolean;
  updatedAt?: Timestamp;
}

export interface BarOrder {
  id: string;
  ticketCode: string;
  tableNumber: string;
  shiftId?: string;
  memberId?: string;
  userId?: string;
  guestName: string;
  tier: PlayerTier;
  items: OrderLineItem[];
  subtotalInr: number;
  discountInr: number;
  gstInr: number;
  totalInr: number;
  kitchenStatus: KitchenStatus;
  tabStatus: TabStatus;
  paymentMethod: PaymentMethod | 'unpaid';
  staffUid: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface BarShift {
  id: string;
  staffUid: string;
  staffName: string;
  dateKey: string;
  openingFloatInr: number;
  cashTotalInr: number;
  cardTotalInr: number;
  upiTotalInr: number;
  ordersCount: number;
  status: 'open' | 'closed';
  notes?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Enquiry {
  id: string;
  referenceCode: string;
  enquiryType: 'trial' | 'enquiry';
  visitorName: string;
  email: string;
  phone: string;
  interestedSport: SportType | 'all';
  interestedTier: MembershipTier | 'undecided';
  preferredDate?: string;
  preferredSlot?: string;
  message?: string;
  stage: EnquiryStage;
  quotedAmountInr?: number;
  staffNotes?: string;
  convertedMemberId?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ClubTransaction {
  id: string;
  source: TransactionSource;
  paymentMethod: PaymentMethod | 'bank_transfer';
  subtotalInr: number;
  discountInr: number;
  gstInr: number;
  totalInr: number;
  referenceId: string;
  description: string;
  dateKey: string;
  recordedByUid: string;
  createdAt?: Timestamp;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientType: 'member' | 'corporate';
  clientName: string;
  clientEmail: string;
  gstin?: string;
  userId?: string;
  description: string;
  subtotalInr: number;
  gstRatePercent: number;
  gstInr: number;
  totalInr: number;
  dueDate: string;
  status: InvoiceStatus;
  paymentMethod: PaymentMethod | 'bank_transfer' | 'unpaid';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface StaffRecord {
  id: string;
  fullName: string;
  email: string;
  department: StaffDepartment;
  shiftSlot: string;
  monthlySalaryInr: number;
  status: 'active' | 'on_leave' | 'inactive';
  lastPaidMonth?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface LeaveRequest {
  id: string;
  staffUid: string;
  staffName: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewerNotes?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export {
  HALF_HOUR_START_SLOTS,
  formatInr,
  getDateKey,
  addDaysToDateKey,
  computeMemberExpiryStatus,
  calculateAgeYears,
  getNextSevenDays,
  getNextFridayDateKey,
  addMinutes,
  addOneHour,
  timeToMinutes,
  slotsOverlap,
  getCourtPriceForTier,
  getShopDiscountPercent,
  getBarDiscountPercent,
} from '@/src/utils/clubHelpers';
