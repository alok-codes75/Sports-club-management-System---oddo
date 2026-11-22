import { addDaysToDateKey } from '@/src/utils/clubHelpers';
import type {
  MembershipTier,
  MemberStatus,
  PaymentMethod,
  SportType,
  StaffDepartment,
  TransactionSource,
} from '@/src/types/club';

export interface SeedMemberInput {
  id: string;
  memberCode: string;
  fullName: string;
  email: string;
  phone: string;
  dob: string;
  tier: MembershipTier;
  status: MemberStatus;
  startDate: string;
  expiryDate: string;
  totalSpentInr: number;
  visitsCount: number;
  notes: string;
}

export interface SeedStaffInput {
  id: string;
  fullName: string;
  email: string;
  department: StaffDepartment;
  shiftSlot: string;
  monthlySalaryInr: number;
  status: 'active' | 'on_leave' | 'inactive';
  lastPaidMonth?: string;
}

export interface SeedInvoiceInput {
  id: string;
  invoiceNumber: string;
  clientType: 'corporate' | 'member';
  clientName: string;
  clientEmail: string;
  gstin?: string;
  description: string;
  subtotalInr: number;
  gstRatePercent: number;
  gstInr: number;
  totalInr: number;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  paymentMethod: PaymentMethod | 'bank_transfer' | 'unpaid';
}

export interface SeedEnquiryInput {
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
  message: string;
  stage: 'new';
}

export interface SeedLeaveInput {
  id: string;
  staffName: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  status: 'pending';
}

export interface SeedTransactionInput {
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
}

const INDIAN_MEMBER_ROSTER: Array<{
  fullName: string;
  tier: MembershipTier;
  dob: string;
  sportNote: string;
  area: string;
}> = [
  // Gold Tier Members (32)
  { fullName: 'Harpreet Singh Gill', tier: 'gold', dob: '1988-03-14', sportNote: 'Morning tennis doubles & Friday Padel', area: 'Sector 8, Chandigarh' },
  { fullName: 'Gurpreet Kaur Sandhu', tier: 'gold', dob: '1991-07-22', sportNote: 'Regular badminton & clubhouse lounge member', area: 'Sector 18, Chandigarh' },
  { fullName: 'Simranjit Singh Bains', tier: 'gold', dob: '1986-11-05', sportNote: 'Corporate turf cricket captain on weekends', area: 'Phase 7, Mohali' },
  { fullName: 'Mehak Malhotra', tier: 'gold', dob: '1993-02-19', sportNote: '6 pm Panoramic Padel league player', area: 'Sector 11, Chandigarh' },
  { fullName: 'Rajinder Pal Singh Grewal', tier: 'gold', dob: '1982-09-30', sportNote: 'Senior tennis ladder finalist', area: 'Sector 9, Chandigarh' },
  { fullName: 'Ananya Sharma', tier: 'gold', dob: '1994-05-11', sportNote: 'Badminton Hall 1 early morning regular', area: 'Sector 35, Chandigarh' },
  { fullName: 'Vikramjit Singh Sidhu', tier: 'gold', dob: '1987-12-08', sportNote: 'Box cricket & post-match terrace dining', area: 'Sector 15, Panchkula' },
  { fullName: 'Prabhjot Kaur Dhillon', tier: 'gold', dob: '1992-04-25', sportNote: 'Tennis singles & pro shop apparel buyer', area: 'Sector 21, Chandigarh' },
  { fullName: 'Rohan Kapoor', tier: 'gold', dob: '1990-08-16', sportNote: 'Padel mixed doubles & corporate wellness lead', area: 'Sector 34, Chandigarh' },
  { fullName: 'Jasleen Kaur Brar', tier: 'gold', dob: '1995-01-29', sportNote: 'Badminton doubles & Friday social organizer', area: 'Sector 19, Chandigarh' },
  { fullName: 'Manpreet Singh Cheema', tier: 'gold', dob: '1985-06-03', sportNote: 'Centre Court 1 evening match player', area: 'Sector 70, Mohali' },
  { fullName: 'Neha Bansal', tier: 'gold', dob: '1993-10-14', sportNote: 'Padel beginner-to-pro clinic graduate', area: 'Sector 16, Chandigarh' },
  { fullName: 'Arjun Dev Chauhan', tier: 'gold', dob: '1989-03-27', sportNote: 'Cricket turf evening league & pace nets', area: 'Sector 4, Panchkula' },
  { fullName: 'Navneet Kaur Sekhon', tier: 'gold', dob: '1991-11-18', sportNote: 'Tennis clay court regular & fitness café', area: 'Sector 33, Chandigarh' },
  { fullName: 'Siddharth Agarwal', tier: 'gold', dob: '1984-07-09', sportNote: 'Annual corporate Gold pass holder', area: 'Sector 22, Chandigarh' },
  { fullName: 'Sukhdeep Singh Bajwa', tier: 'gold', dob: '1988-05-21', sportNote: 'Weekend box cricket & badminton singles', area: 'Sector 68, Mohali' },
  { fullName: 'Ritu Chaudhary', tier: 'gold', dob: '1992-09-12', sportNote: 'Evening badminton & Yonex gear subscriber', area: 'Sector 44, Chandigarh' },
  { fullName: 'Karanvir Singh Aulakh', tier: 'gold', dob: '1990-01-04', sportNote: 'Panoramic Padel 2 indoor regular', area: 'Sector 10, Chandigarh' },
  { fullName: 'Priyanka Joshi', tier: 'gold', dob: '1994-08-23', sportNote: 'Morning tennis rally & express restringing', area: 'Sector 27, Chandigarh' },
  { fullName: 'Deepak Kumar Garg', tier: 'gold', dob: '1983-12-15', sportNote: 'Founding Gold member · 7 am tennis squad', area: 'Sector 7, Panchkula' },
  { fullName: 'Amritpal Singh Virk', tier: 'gold', dob: '1987-04-06', sportNote: 'Cricket bowling machine & weekend turf', area: 'Sector 63, Mohali' },
  { fullName: 'Shruti Khanna', tier: 'gold', dob: '1993-06-17', sportNote: 'Padel & Friday night social regular', area: 'Sector 36, Chandigarh' },
  { fullName: 'Gaurav Sood', tier: 'gold', dob: '1986-02-28', sportNote: 'All-four sports active Gold subscriber', area: 'Sector 15, Chandigarh' },
  { fullName: 'Harmanpreet Kaur Kang', tier: 'gold', dob: '1995-03-11', sportNote: 'Competitive badminton & club tournaments', area: 'Phase 11, Mohali' },
  { fullName: 'Varun Thakur', tier: 'gold', dob: '1989-10-02', sportNote: 'Tennis Court 2 synthetic clay regular', area: 'Sector 20, Panchkula' },
  { fullName: 'Pooja Bhatia', tier: 'gold', dob: '1992-12-19', sportNote: 'Morning badminton & terrace coffee club', area: 'Sector 38, Chandigarh' },
  { fullName: 'Inderjit Singh Randhawa', tier: 'gold', dob: '1981-08-07', sportNote: 'Senior Gold member · corporate host', area: 'Sector 5, Chandigarh' },
  { fullName: 'Divya Nair', tier: 'gold', dob: '1994-04-14', sportNote: 'IT Park Padel & tennis evening player', area: 'IT Park, Chandigarh' },
  { fullName: 'Taranjeet Singh Sohi', tier: 'gold', dob: '1988-09-25', sportNote: 'Cricket turf evening captain', area: 'Sector 71, Mohali' },
  { fullName: 'Meenakshi Verma', tier: 'gold', dob: '1991-01-30', sportNote: 'Badminton doubles & Gold shop discounts', area: 'Sector 37, Chandigarh' },
  { fullName: 'Nikhil Mahajan', tier: 'gold', dob: '1987-07-13', sportNote: 'Tennis & padel weekend challenger', area: 'Sector 8, Panchkula' },
  { fullName: 'Sandeep Kaur Dhaliwal', tier: 'gold', dob: '1990-05-08', sportNote: 'Early morning Centre Court 1 member', area: 'Sector 32, Chandigarh' },

  // Silver Tier Members (28)
  { fullName: 'Amanpreet Singh Chahal', tier: 'silver', dob: '1994-06-18', sportNote: 'Evening box cricket & weekday nets', area: 'Phase 3B2, Mohali' },
  { fullName: 'Kritika Jindal', tier: 'silver', dob: '1997-02-10', sportNote: 'Weekend badminton hall player', area: 'Sector 40, Chandigarh' },
  { fullName: 'Saurabh Tiwari', tier: 'silver', dob: '1992-11-24', sportNote: 'IT Park badminton & padel player', area: 'Zirakpur, Punjab' },
  { fullName: 'Lovepreet Kaur Mann', tier: 'silver', dob: '1996-08-05', sportNote: 'Tennis coaching & weekend match play', area: 'Sector 43, Chandigarh' },
  { fullName: 'Prashant Rawat', tier: 'silver', dob: '1991-03-19', sportNote: 'Cricket turf striker · Friday evenings', area: 'Sector 12, Panchkula' },
  { fullName: 'Aishwarya Deshpande', tier: 'silver', dob: '1995-09-27', sportNote: 'Padel social group & gear shop customer', area: 'Sector 23, Chandigarh' },
  { fullName: 'Gagandeep Singh Kahlon', tier: 'silver', dob: '1993-01-15', sportNote: 'Badminton Hall 2 doubles regular', area: 'Kharar, Mohali' },
  { fullName: 'Shreya Mukherjee', tier: 'silver', dob: '1996-04-09', sportNote: 'Tennis evening rallies & cold brew bar', area: 'Sector 46, Chandigarh' },
  { fullName: 'Vivek Kumar Yadav', tier: 'silver', dob: '1990-12-03', sportNote: 'Weekend box cricket squad organizer', area: 'Sector 47, Chandigarh' },
  { fullName: 'Harsimran Kaur Pannu', tier: 'silver', dob: '1998-07-21', sportNote: 'University badminton circuit player', area: 'Sector 14, Chandigarh' },
  { fullName: 'Mohit Singla', tier: 'silver', dob: '1992-05-16', sportNote: 'Cricket practice nets & turf bookings', area: 'Sector 9, Panchkula' },
  { fullName: 'Tanvi Saxena', tier: 'silver', dob: '1997-10-30', sportNote: 'Padel beginner batch · Tuesday/Thursday', area: 'Sector 48, Chandigarh' },
  { fullName: 'Balwinder Singh Johal', tier: 'silver', dob: '1986-04-22', sportNote: 'Morning tennis doubles partner', area: 'Phase 5, Mohali' },
  { fullName: 'Nandini Kulkarni', tier: 'silver', dob: '1995-11-11', sportNote: 'Badminton & post-match protein wraps', area: 'Sector 49, Chandigarh' },
  { fullName: 'Abhishek Rana', tier: 'silver', dob: '1993-08-14', sportNote: 'Box cricket & Friday night social play', area: 'Sector 21, Panchkula' },
  { fullName: 'Komalpreet Kaur Hundal', tier: 'silver', dob: '1997-03-07', sportNote: 'Badminton Hall 1 morning shuttle batch', area: 'Sector 67, Mohali' },
  { fullName: 'Pankaj Mittal', tier: 'silver', dob: '1989-06-29', sportNote: 'Corporate cricket & tennis visitor', area: 'Sector 35, Chandigarh' },
  { fullName: 'Roshni Gupta', tier: 'silver', dob: '1996-01-12', sportNote: 'Evening padel & Yonex shoe buyer', area: 'Sector 50, Chandigarh' },
  { fullName: 'Jaskaran Singh Toor', tier: 'silver', dob: '1994-09-04', sportNote: 'Bowling practice nets pace bowler', area: 'Sector 69, Mohali' },
  { fullName: 'Bhavna Sharma', tier: 'silver', dob: '1992-02-26', sportNote: 'Tennis Court 2 weekend regular', area: 'Sector 17, Panchkula' },
  { fullName: 'Chirag Mehta', tier: 'silver', dob: '1995-05-19', sportNote: 'Padel doubles & pro shop stringing', area: 'Sector 28, Chandigarh' },
  { fullName: 'Parveen Kumar Dogra', tier: 'silver', dob: '1988-10-08', sportNote: 'Morning badminton & weekend cricket', area: 'Sector 45, Chandigarh' },
  { fullName: 'Sonalika Bedi', tier: 'silver', dob: '1994-12-21', sportNote: 'Tennis & Friday mixed social play', area: 'Sector 18, Chandigarh' },
  { fullName: 'Raghavendra Singh Negi', tier: 'silver', dob: '1991-07-02', sportNote: 'Box cricket turf all-rounder', area: 'Zirakpur, Punjab' },
  { fullName: 'Charanjeet Kaur Purewal', tier: 'silver', dob: '1993-04-15', sportNote: 'Badminton fitness league member', area: 'Phase 9, Mohali' },
  { fullName: 'Yashpal Sharma', tier: 'silver', dob: '1987-11-28', sportNote: 'Evening tennis & clubhouse lounge', area: 'Sector 11, Panchkula' },
  { fullName: 'Pallavi Awasthi', tier: 'silver', dob: '1996-06-06', sportNote: 'Indoor padel & badminton doubles', area: 'Sector 39, Chandigarh' },
  { fullName: 'Harshvardhan Chawla', tier: 'silver', dob: '1995-08-17', sportNote: 'Cricket turf evening corporate squad', area: 'Sector 42, Chandigarh' },

  // Junior (<18) Tier Members (15 — all DOB 2010–2015, strictly under 18 in 2026)
  { fullName: 'Aarav Sharma', tier: 'junior', dob: '2011-05-14', sportNote: 'U-16 Chandigarh Tennis Academy squad', area: 'Sector 18, Chandigarh' },
  { fullName: 'Anvi Kaur Gill', tier: 'junior', dob: '2012-09-03', sportNote: 'Junior Badminton Hall 1 morning batch', area: 'Sector 8, Chandigarh' },
  { fullName: 'Vihaan Verma', tier: 'junior', dob: '2010-11-20', sportNote: 'U-17 Cricket Pace Bowling Nets batch', area: 'Phase 7, Mohali' },
  { fullName: 'Myra Malhotra', tier: 'junior', dob: '2013-02-18', sportNote: 'Junior Tennis clay court foundation', area: 'Sector 11, Chandigarh' },
  { fullName: 'Reyansh Kapoor', tier: 'junior', dob: '2011-08-29', sportNote: 'U-16 Badminton & Padel academy', area: 'Sector 34, Chandigarh' },
  { fullName: 'Saanvi Bansal', tier: 'junior', dob: '2012-04-07', sportNote: 'State-level junior badminton trainee', area: 'Sector 16, Chandigarh' },
  { fullName: 'Kabir Singh Sandhu', tier: 'junior', dob: '2010-06-12', sportNote: 'U-17 Box Cricket & batting nets', area: 'Sector 70, Mohali' },
  { fullName: 'Aadhya Chauhan', tier: 'junior', dob: '2013-10-25', sportNote: 'Junior Tennis weekend academy', area: 'Sector 4, Panchkula' },
  { fullName: 'Advait Garg', tier: 'junior', dob: '2011-01-31', sportNote: 'Junior Badminton & racket coaching', area: 'Sector 7, Panchkula' },
  { fullName: 'Inaya Kaur Brar', tier: 'junior', dob: '2014-03-09', sportNote: 'U-13 Mini Tennis & agility drills', area: 'Sector 19, Chandigarh' },
  { fullName: 'Vivaan Sood', tier: 'junior', dob: '2012-07-16', sportNote: 'Junior Cricket nets & weekend turf', area: 'Sector 15, Chandigarh' },
  { fullName: 'Navya Khanna', tier: 'junior', dob: '2011-12-04', sportNote: 'U-15 Padel & Tennis development squad', area: 'Sector 36, Chandigarh' },
  { fullName: 'Atharv Mahajan', tier: 'junior', dob: '2013-06-22', sportNote: 'Junior Badminton evening coaching', area: 'Sector 8, Panchkula' },
  { fullName: 'Sehajpreet Singh Bajwa', tier: 'junior', dob: '2010-09-15', sportNote: 'U-17 Cricket Turf & spin bowling nets', area: 'Sector 68, Mohali' },
  { fullName: 'Kiara Bhatia', tier: 'junior', dob: '2014-08-11', sportNote: 'U-13 Badminton academy · parent guardian linked', area: 'Sector 38, Chandigarh' },
];

export function buildUdaanMembers(today: string): SeedMemberInput[] {
  const mobilePrefixes = ['98140', '98720', '98760', '98150', '94170', '99150', '98880', '97790'];

  return INDIAN_MEMBER_ROSTER.map((entry, idx) => {
    const num = idx + 1;
    const tierPrefix = entry.tier === 'gold' ? 'G' : entry.tier === 'silver' ? 'S' : 'J';
    const memberCode = `USC-${tierPrefix}${String(1000 + num)}`;
    const slug = entry.fullName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '');

    // Distribute realistic expiry statuses: ~57 active, ~10 expiring_soon (3–12 days), ~8 expired (-4 to -25 days)
    let status: MemberStatus = 'active';
    let expiryOffsetDays = 45 + ((num * 17) % 280);
    let startOffsetDays = -(30 + ((num * 11) % 180));

    if (num % 8 === 0) {
      status = 'expiring_soon';
      expiryOffsetDays = 3 + (num % 10);
      startOffsetDays = -(80 + (num % 30));
    } else if (num % 10 === 0) {
      status = 'expired';
      expiryOffsetDays = -(4 + (num % 20));
      startOffsetDays = -(110 + (num % 40));
    }

    const baseSpend =
      entry.tier === 'gold' ? 42000 : entry.tier === 'silver' ? 21000 : 12500;
    const totalSpentInr = baseSpend + ((num * 3750) % 48000);
    const visitsCount = 8 + ((num * 5) % 58);

    const prefix = mobilePrefixes[idx % mobilePrefixes.length];
    const suffix = String(11000 + num * 137).slice(-5);

    return {
      id: `usc-mem-${String(num).padStart(2, '0')}`,
      memberCode,
      fullName: entry.fullName,
      email: `${slug}@udaanmembers.in`,
      phone: `+91 ${prefix} ${suffix}`,
      dob: entry.dob,
      tier: entry.tier,
      status,
      startDate: addDaysToDateKey(today, startOffsetDays),
      expiryDate: addDaysToDateKey(today, expiryOffsetDays),
      totalSpentInr,
      visitsCount,
      notes: `${entry.sportNote} · ${entry.area}`,
    };
  });
}

export function buildUdaanStaff(today: string): SeedStaffInput[] {
  const currentMonth = today.slice(0, 7);

  return [
    // Management (3)
    {
      id: 'usc-staff-01',
      fullName: 'Rajeshwar Singh Gill',
      email: 'rajeshwar.gm@udaansportsclub.in',
      department: 'management',
      shiftSlot: 'General Manager · 09:00–18:30',
      monthlySalaryInr: 135000,
      status: 'active',
      lastPaidMonth: currentMonth,
    },
    {
      id: 'usc-staff-02',
      fullName: 'Meenakshi Sharma',
      email: 'meenakshi.finance@udaansportsclub.in',
      department: 'management',
      shiftSlot: 'Finance & GST Head · 09:30–18:30',
      monthlySalaryInr: 98000,
      status: 'active',
      lastPaidMonth: currentMonth,
    },
    {
      id: 'usc-staff-03',
      fullName: 'Vikramjit Singh Sandhu',
      email: 'vikramjit.ops@udaansportsclub.in',
      department: 'management',
      shiftSlot: 'Operations & HR Manager · 08:30–18:00',
      monthlySalaryInr: 88000,
      status: 'active',
      lastPaidMonth: currentMonth,
    },

    // Coaching Academy (6)
    {
      id: 'usc-staff-04',
      fullName: 'Harjinder Singh Bedi',
      email: 'harjinder.tennis@udaansportsclub.in',
      department: 'coaching',
      shiftSlot: 'Head Tennis Coach · 06:00–10:30 & 16:30–20:30',
      monthlySalaryInr: 82000,
      status: 'active',
      lastPaidMonth: currentMonth,
    },
    {
      id: 'usc-staff-05',
      fullName: 'Rohit Verma',
      email: 'rohit.cricket@udaansportsclub.in',
      department: 'coaching',
      shiftSlot: 'Head Cricket Coach · 06:30–11:00 & 16:00–20:30',
      monthlySalaryInr: 78000,
      status: 'active',
      lastPaidMonth: currentMonth,
    },
    {
      id: 'usc-staff-06',
      fullName: 'Ankita Deshmukh',
      email: 'ankita.badminton@udaansportsclub.in',
      department: 'coaching',
      shiftSlot: 'Senior Badminton Coach · 06:00–10:00 & 17:00–21:00',
      monthlySalaryInr: 72000,
      status: 'active',
      lastPaidMonth: currentMonth,
    },
    {
      id: 'usc-staff-07',
      fullName: 'Siddharth Malhotra',
      email: 'siddharth.padel@udaansportsclub.in',
      department: 'coaching',
      shiftSlot: 'Lead Padel Coach · 07:00–11:00 & 17:00–21:30',
      monthlySalaryInr: 68000,
      status: 'active',
    },
    {
      id: 'usc-staff-08',
      fullName: 'Jaspreet Kaur Aulakh',
      email: 'jaspreet.junior@udaansportsclub.in',
      department: 'coaching',
      shiftSlot: 'Junior Academy Coach · 15:00–20:30',
      monthlySalaryInr: 58000,
      status: 'active',
      lastPaidMonth: currentMonth,
    },
    {
      id: 'usc-staff-09',
      fullName: 'Devendra Singh Rawat',
      email: 'devendra.fitness@udaansportsclub.in',
      department: 'coaching',
      shiftSlot: 'Strength & Conditioning · 06:00–14:00',
      monthlySalaryInr: 56000,
      status: 'active',
    },

    // Front Desk, CRM & Pro Shop (6)
    {
      id: 'usc-staff-10',
      fullName: 'Priya Menon',
      email: 'priya.desk@udaansportsclub.in',
      department: 'front_desk',
      shiftSlot: 'Front Desk Lead · Morning 06:00–14:00',
      monthlySalaryInr: 48000,
      status: 'active',
      lastPaidMonth: currentMonth,
    },
    {
      id: 'usc-staff-11',
      fullName: 'Simran Kaur Cheema',
      email: 'simran.crm@udaansportsclub.in',
      department: 'front_desk',
      shiftSlot: 'Member Relations & CRM · 09:00–17:30',
      monthlySalaryInr: 44000,
      status: 'active',
      lastPaidMonth: currentMonth,
    },
    {
      id: 'usc-staff-12',
      fullName: 'Manish Kumar Gupta',
      email: 'manish.shop@udaansportsclub.in',
      department: 'front_desk',
      shiftSlot: 'Pro Gear Shop Supervisor · 10:00–19:00',
      monthlySalaryInr: 42000,
      status: 'active',
      lastPaidMonth: currentMonth,
    },
    {
      id: 'usc-staff-13',
      fullName: 'Nisha Thakur',
      email: 'nisha.desk@udaansportsclub.in',
      department: 'front_desk',
      shiftSlot: 'Front Desk Executive · Evening 14:00–22:00',
      monthlySalaryInr: 36000,
      status: 'active',
      lastPaidMonth: currentMonth,
    },
    {
      id: 'usc-staff-14',
      fullName: 'Gaurav Saini',
      email: 'gaurav.stringing@udaansportsclub.in',
      department: 'front_desk',
      shiftSlot: 'Racket Technician & POS · 12:00–21:00',
      monthlySalaryInr: 35000,
      status: 'active',
    },
    {
      id: 'usc-staff-15',
      fullName: 'Kajal Joshi',
      email: 'kajal.reception@udaansportsclub.in',
      department: 'front_desk',
      shiftSlot: 'Morning Court Coordinator · 06:00–14:00',
      monthlySalaryInr: 34000,
      status: 'active',
      lastPaidMonth: currentMonth,
    },

    // Clubhouse Bar & Kitchen (6)
    {
      id: 'usc-staff-16',
      fullName: 'Chef Ranveer Singh Brar',
      email: 'ranveer.kitchen@udaansportsclub.in',
      department: 'bar_kitchen',
      shiftSlot: 'Executive Clubhouse Chef · 11:00–21:30',
      monthlySalaryInr: 68000,
      status: 'active',
      lastPaidMonth: currentMonth,
    },
    {
      id: 'usc-staff-17',
      fullName: 'Karthik Shetty',
      email: 'karthik.bar@udaansportsclub.in',
      department: 'bar_kitchen',
      shiftSlot: 'Head Bar Supervisor · Evening 14:00–22:30',
      monthlySalaryInr: 48000,
      status: 'active',
      lastPaidMonth: currentMonth,
    },
    {
      id: 'usc-staff-18',
      fullName: 'Sukhbir Singh Dhillon',
      email: 'sukhbir.chef@udaansportsclub.in',
      department: 'bar_kitchen',
      shiftSlot: 'Sous Chef · Morning Café 06:30–15:00',
      monthlySalaryInr: 42000,
      status: 'active',
      lastPaidMonth: currentMonth,
    },
    {
      id: 'usc-staff-19',
      fullName: 'Aarti Negi',
      email: 'aarti.barista@udaansportsclub.in',
      department: 'bar_kitchen',
      shiftSlot: 'Lead Barista & Lounge · 07:00–15:30',
      monthlySalaryInr: 36000,
      status: 'active',
    },
    {
      id: 'usc-staff-20',
      fullName: 'Deepak Sharma',
      email: 'deepak.steward@udaansportsclub.in',
      department: 'bar_kitchen',
      shiftSlot: 'Bar Steward · Evening 14:00–22:30',
      monthlySalaryInr: 32000,
      status: 'active',
      lastPaidMonth: currentMonth,
    },
    {
      id: 'usc-staff-21',
      fullName: 'Sunita Kumari',
      email: 'sunita.kitchen@udaansportsclub.in',
      department: 'bar_kitchen',
      shiftSlot: 'Kitchen Prep & Nutrition · 08:00–16:30',
      monthlySalaryInr: 30000,
      status: 'active',
    },

    // Facility & Turf Maintenance (4)
    {
      id: 'usc-staff-22',
      fullName: 'Baldev Singh Rana',
      email: 'baldev.facility@udaansportsclub.in',
      department: 'maintenance',
      shiftSlot: 'Chief Facility Engineer · 07:00–16:00',
      monthlySalaryInr: 46000,
      status: 'active',
      lastPaidMonth: currentMonth,
    },
    {
      id: 'usc-staff-23',
      fullName: 'Ramesh Kumar Yadav',
      email: 'ramesh.turf@udaansportsclub.in',
      department: 'maintenance',
      shiftSlot: 'Turf & Court Curator · 05:30–14:00',
      monthlySalaryInr: 34000,
      status: 'active',
      lastPaidMonth: currentMonth,
    },
    {
      id: 'usc-staff-24',
      fullName: 'Kulwinder Singh',
      email: 'kulwinder.electric@udaansportsclub.in',
      department: 'maintenance',
      shiftSlot: 'Floodlight & HVAC Tech · 13:30–22:30',
      monthlySalaryInr: 32000,
      status: 'active',
    },
    {
      id: 'usc-staff-25',
      fullName: 'Suresh Pal',
      email: 'suresh.housekeeping@udaansportsclub.in',
      department: 'maintenance',
      shiftSlot: 'Housekeeping Lead · 06:00–14:30',
      monthlySalaryInr: 28000,
      status: 'active',
      lastPaidMonth: currentMonth,
    },
  ];
}

export function buildUdaanInvoices(today: string): SeedInvoiceInput[] {
  return [
    {
      id: 'usc-inv-01',
      invoiceNumber: 'USC-2026-201',
      clientType: 'corporate',
      clientName: 'Infosys Chandigarh IT Park Sports Club',
      clientEmail: 'wellness.chd@infosys-partner.in',
      gstin: '04AAACI4798L1Z2',
      description: 'Corporate Wellness Retainer — 30 Monthly Employee Passes & Weekend Box Cricket Turf',
      subtotalInr: 145000,
      gstRatePercent: 18,
      gstInr: 26100,
      totalInr: 171100,
      dueDate: addDaysToDateKey(today, 12),
      status: 'sent',
      paymentMethod: 'unpaid',
    },
    {
      id: 'usc-inv-02',
      invoiceNumber: 'USC-2026-202',
      clientType: 'corporate',
      clientName: 'QuarkCity India Pvt Ltd (Mohali)',
      clientEmail: 'hr.events@quarkcity-mohali.in',
      gstin: '03AABCQ7821K1Z8',
      description: 'Quarterly Tech Park Padel & Badminton Tournament Sponsorship + Venue Booking',
      subtotalInr: 95000,
      gstRatePercent: 18,
      gstInr: 17100,
      totalInr: 112100,
      dueDate: addDaysToDateKey(today, 8),
      status: 'sent',
      paymentMethod: 'unpaid',
    },
    {
      id: 'usc-inv-03',
      invoiceNumber: 'USC-2026-203',
      clientType: 'corporate',
      clientName: 'Trident Group Sports & Recreation Committee',
      clientEmail: 'sports.committee@trident-punjab.in',
      gstin: '03AAACT4950Q1Z4',
      description: 'Executive Tennis & Clubhouse Hospitality Package (15 Gold Corporate Seats)',
      subtotalInr: 120000,
      gstRatePercent: 18,
      gstInr: 21600,
      totalInr: 141600,
      dueDate: addDaysToDateKey(today, -3),
      status: 'paid',
      paymentMethod: 'bank_transfer',
    },
    {
      id: 'usc-inv-04',
      invoiceNumber: 'USC-2026-204',
      clientType: 'corporate',
      clientName: 'Vardhman Textiles Ltd (Ludhiana & Chandigarh)',
      clientEmail: 'admin.chd@vardhman-group.in',
      gstin: '03AAACV5140M1Z9',
      description: 'Annual Inter-Corporate Box Cricket League & Evening Terrace Catering',
      subtotalInr: 82000,
      gstRatePercent: 18,
      gstInr: 14760,
      totalInr: 96760,
      dueDate: addDaysToDateKey(today, 15),
      status: 'sent',
      paymentMethod: 'unpaid',
    },
    {
      id: 'usc-inv-05',
      invoiceNumber: 'USC-2026-205',
      clientType: 'corporate',
      clientName: 'Elante Hospitality & Retail Ventures',
      clientEmail: 'people@elante-ventures.in',
      gstin: '04AABCE9124R1Z1',
      description: 'Friday Night Padel Social & Staff Fitness Retainer (20 Passes)',
      subtotalInr: 68000,
      gstRatePercent: 18,
      gstInr: 12240,
      totalInr: 80240,
      dueDate: addDaysToDateKey(today, -7),
      status: 'paid',
      paymentMethod: 'bank_transfer',
    },
    {
      id: 'usc-inv-06',
      invoiceNumber: 'USC-2026-206',
      clientType: 'corporate',
      clientName: 'Chandigarh Lawn Tennis Foundation',
      clientEmail: 'accounts@cltf-chandigarh.in',
      gstin: '04AAATC3341H1Z6',
      description: 'Junior U-16 Ranking Camp — DecoTurf Court Block & Ball Machine Support',
      subtotalInr: 54000,
      gstRatePercent: 18,
      gstInr: 9720,
      totalInr: 63720,
      dueDate: addDaysToDateKey(today, -2),
      status: 'paid',
      paymentMethod: 'upi',
    },
    {
      id: 'usc-inv-07',
      invoiceNumber: 'USC-2026-207',
      clientType: 'member',
      clientName: 'Harpreet Singh Gill',
      clientEmail: 'harpreet.singh.gill@udaanmembers.in',
      description: 'Annual Gold Family Membership Renewal (12 Months · Sector 8)',
      subtotalInr: 52000,
      gstRatePercent: 18,
      gstInr: 9360,
      totalInr: 61360,
      dueDate: addDaysToDateKey(today, -4),
      status: 'paid',
      paymentMethod: 'upi',
    },
    {
      id: 'usc-inv-08',
      invoiceNumber: 'USC-2026-208',
      clientType: 'member',
      clientName: 'Inderjit Singh Randhawa',
      clientEmail: 'inderjit.singh.randhawa@udaanmembers.in',
      description: 'Annual Gold Membership + Private Tennis Coaching Bundle',
      subtotalInr: 64000,
      gstRatePercent: 18,
      gstInr: 11520,
      totalInr: 75520,
      dueDate: addDaysToDateKey(today, 6),
      status: 'sent',
      paymentMethod: 'unpaid',
    },
  ];
}

export function buildUdaanEnquiries(today: string): SeedEnquiryInput[] {
  return [
    {
      id: 'usc-enq-01',
      referenceCode: 'TRL-4101',
      enquiryType: 'trial',
      visitorName: 'Aakashdeep Singh Kang',
      email: 'aakashdeep.kang@example.in',
      phone: '+91 98142 55101',
      interestedSport: 'padel',
      interestedTier: 'gold',
      preferredDate: addDaysToDateKey(today, 1),
      preferredSlot: '18:30',
      message: 'Looking to book a 4-player panoramic padel trial with demo Bullpadel rackets.',
      stage: 'new',
    },
    {
      id: 'usc-enq-02',
      referenceCode: 'ENQ-4102',
      enquiryType: 'enquiry',
      visitorName: 'Ruchika Mittal (Tech Mahindra Mohali)',
      email: 'ruchika.mittal@example.in',
      phone: '+91 98722 66202',
      interestedSport: 'cricket',
      interestedTier: 'undecided',
      message: 'Corporate enquiry for 25 employees for weekend box cricket turf league and café packages.',
      stage: 'new',
    },
    {
      id: 'usc-enq-03',
      referenceCode: 'TRL-4103',
      enquiryType: 'trial',
      visitorName: 'Pranav Sharma',
      email: 'pranav.sharma@example.in',
      phone: '+91 98761 77303',
      interestedSport: 'tennis',
      interestedTier: 'gold',
      preferredDate: addDaysToDateKey(today, 2),
      preferredSlot: '07:00',
      message: 'Interested in early morning DecoTurf singles coaching before office hours.',
      stage: 'new',
    },
    {
      id: 'usc-enq-04',
      referenceCode: 'ENQ-4104',
      enquiryType: 'enquiry',
      visitorName: 'Maninder Kaur Sekhon',
      email: 'maninder.sekhon@example.in',
      phone: '+91 98154 88404',
      interestedSport: 'badminton',
      interestedTier: 'junior',
      message: 'Enquiring about Junior (<18) summer badminton academy timings for my 13-year-old son.',
      stage: 'new',
    },
    {
      id: 'usc-enq-05',
      referenceCode: 'TRL-4105',
      enquiryType: 'trial',
      visitorName: 'Saurav Dhawan',
      email: 'saurav.dhawan@example.in',
      phone: '+91 94173 99505',
      interestedSport: 'cricket',
      interestedTier: 'silver',
      preferredDate: addDaysToDateKey(today, 1),
      preferredSlot: '19:00',
      message: 'Want to try the indoor bowling machine nets with 3 friends from Sector 34.',
      stage: 'new',
    },
    {
      id: 'usc-enq-06',
      referenceCode: 'ENQ-4106',
      enquiryType: 'enquiry',
      visitorName: 'Dr. Parvinder Singh Kohli',
      email: 'dr.kohli.pgi@example.in',
      phone: '+91 98140 12606',
      interestedSport: 'all',
      interestedTier: 'gold',
      message: 'Interested in an annual couple Gold membership with morning tennis and bar lounge access.',
      stage: 'new',
    },
    {
      id: 'usc-enq-07',
      referenceCode: 'TRL-4107',
      enquiryType: 'trial',
      visitorName: 'Niharika Joshi',
      email: 'niharika.joshi@example.in',
      phone: '+91 99155 23707',
      interestedSport: 'badminton',
      interestedTier: 'silver',
      preferredDate: addDaysToDateKey(today, 3),
      preferredSlot: '17:30',
      message: 'Checking maple-wood indoor court availability for evening doubles.',
      stage: 'new',
    },
    {
      id: 'usc-enq-08',
      referenceCode: 'ENQ-4108',
      enquiryType: 'enquiry',
      visitorName: 'Gurcharan Singh Oberoi',
      email: 'gurcharan.oberoi@example.in',
      phone: '+91 98882 34808',
      interestedSport: 'padel',
      interestedTier: 'gold',
      message: 'Looking for Friday Night Social Play enrollment details and annual billing.',
      stage: 'new',
    },
    {
      id: 'usc-enq-09',
      referenceCode: 'TRL-4109',
      enquiryType: 'trial',
      visitorName: 'Tanishq Chopra',
      email: 'tanishq.chopra@example.in',
      phone: '+91 97791 45909',
      interestedSport: 'tennis',
      interestedTier: 'junior',
      preferredDate: addDaysToDateKey(today, 2),
      preferredSlot: '16:30',
      message: 'U-15 tennis player from Panchkula looking for a trial evaluation with Coach Harjinder.',
      stage: 'new',
    },
    {
      id: 'usc-enq-10',
      referenceCode: 'ENQ-4110',
      enquiryType: 'enquiry',
      visitorName: 'Swati Arora (HDFC Bank Sector 17)',
      email: 'swati.arora@example.in',
      phone: '+91 98148 56010',
      interestedSport: 'all',
      interestedTier: 'undecided',
      message: 'Planning a corporate family sports day for 40 Chandigarh branch staff next month.',
      stage: 'new',
    },
  ];
}

export function buildUdaanLeaves(today: string): SeedLeaveInput[] {
  return [
    {
      id: 'usc-leave-01',
      staffName: 'Karthik Shetty (Head Bar Supervisor)',
      startDate: addDaysToDateKey(today, 3),
      endDate: addDaysToDateKey(today, 4),
      daysCount: 2,
      reason: 'Sister engagement ceremony in Ludhiana — Deepak Sharma covering evening bar shift.',
      status: 'pending',
    },
    {
      id: 'usc-leave-02',
      staffName: 'Ankita Deshmukh (Senior Badminton Coach)',
      startDate: addDaysToDateKey(today, 6),
      endDate: addDaysToDateKey(today, 8),
      daysCount: 3,
      reason: 'Attending BAI Level-2 coaching refresher seminar in New Delhi — Jaspreet covering junior batch.',
      status: 'pending',
    },
    {
      id: 'usc-leave-03',
      staffName: 'Nisha Thakur (Front Desk Executive)',
      startDate: addDaysToDateKey(today, 5),
      endDate: addDaysToDateKey(today, 5),
      daysCount: 1,
      reason: 'Personal medical check-up at Sector 16 Hospital — Kajal Joshi confirmed shift swap.',
      status: 'pending',
    },
    {
      id: 'usc-leave-04',
      staffName: 'Ramesh Kumar Yadav (Turf & Court Curator)',
      startDate: addDaysToDateKey(today, 9),
      endDate: addDaysToDateKey(today, 11),
      daysCount: 3,
      reason: 'Family travel to hometown — Kulwinder & Baldev supervising morning turf prep.',
      status: 'pending',
    },
    {
      id: 'usc-leave-05',
      staffName: 'Gaurav Saini (Racket Technician & POS)',
      startDate: addDaysToDateKey(today, 4),
      endDate: addDaysToDateKey(today, 4),
      daysCount: 1,
      reason: 'Bank and passport appointment in Sector 34 — Manish Gupta covering pro shop desk.',
      status: 'pending',
    },
  ];
}

export function buildUdaanTransactions(today: string): SeedTransactionInput[] {
  return [
    {
      id: 'usc-tx-01',
      source: 'corporate',
      paymentMethod: 'bank_transfer',
      subtotalInr: 120000,
      discountInr: 0,
      gstInr: 21600,
      totalInr: 141600,
      referenceId: 'USC-2026-203',
      description: 'Trident Group Sports Committee — 15 Corporate Gold Seats',
      dateKey: addDaysToDateKey(today, -3),
    },
    {
      id: 'usc-tx-02',
      source: 'corporate',
      paymentMethod: 'bank_transfer',
      subtotalInr: 68000,
      discountInr: 0,
      gstInr: 12240,
      totalInr: 80240,
      referenceId: 'USC-2026-205',
      description: 'Elante Hospitality Ventures — 20 Staff Fitness Passes',
      dateKey: addDaysToDateKey(today, -7),
    },
    {
      id: 'usc-tx-03',
      source: 'corporate',
      paymentMethod: 'upi',
      subtotalInr: 54000,
      discountInr: 0,
      gstInr: 9720,
      totalInr: 63720,
      referenceId: 'USC-2026-206',
      description: 'Chandigarh Lawn Tennis Foundation — U-16 Camp Court Block',
      dateKey: addDaysToDateKey(today, -2),
    },
    {
      id: 'usc-tx-04',
      source: 'membership',
      paymentMethod: 'upi',
      subtotalInr: 52000,
      discountInr: 0,
      gstInr: 9360,
      totalInr: 61360,
      referenceId: 'USC-G1001',
      description: 'Annual Gold Family Membership Renewal — Harpreet Singh Gill',
      dateKey: addDaysToDateKey(today, -4),
    },
    {
      id: 'usc-tx-05',
      source: 'membership',
      paymentMethod: 'card',
      subtotalInr: 52000,
      discountInr: 0,
      gstInr: 9360,
      totalInr: 61360,
      referenceId: 'USC-G1005',
      description: 'Annual Gold Membership — Rajinder Pal Singh Grewal',
      dateKey: addDaysToDateKey(today, -1),
    },
    {
      id: 'usc-tx-06',
      source: 'membership',
      paymentMethod: 'upi',
      subtotalInr: 14997,
      discountInr: 0,
      gstInr: 2699,
      totalInr: 17696,
      referenceId: 'USC-G1009',
      description: 'Quarterly Gold Plan — Rohan Kapoor (Sector 34)',
      dateKey: today,
    },
    {
      id: 'usc-tx-07',
      source: 'membership',
      paymentMethod: 'upi',
      subtotalInr: 7497,
      discountInr: 0,
      gstInr: 1349,
      totalInr: 8846,
      referenceId: 'USC-S1033',
      description: 'Quarterly Silver Plan — Amanpreet Singh Chahal (Mohali)',
      dateKey: today,
    },
    {
      id: 'usc-tx-08',
      source: 'court',
      paymentMethod: 'upi',
      subtotalInr: 4746,
      discountInr: 0,
      gstInr: 854,
      totalInr: 5600,
      referenceId: 'BK-USC-901',
      description: 'Cricket Turf Arena A — Corporate 6-a-Side Evening Double Header',
      dateKey: today,
    },
    {
      id: 'usc-tx-09',
      source: 'court',
      paymentMethod: 'card',
      subtotalInr: 2542,
      discountInr: 450,
      gstInr: 458,
      totalInr: 3000,
      referenceId: 'BK-USC-902',
      description: 'Panoramic Padel 1 & 2 — Evening Member & Guest Slots',
      dateKey: today,
    },
    {
      id: 'usc-tx-10',
      source: 'court',
      paymentMethod: 'cash',
      subtotalInr: 1695,
      discountInr: 0,
      gstInr: 305,
      totalInr: 2000,
      referenceId: 'BK-USC-903',
      description: 'Badminton Hall 1 & 2 — Morning Walk-In Court Bookings',
      dateKey: addDaysToDateKey(today, -1),
    },
    {
      id: 'usc-tx-11',
      source: 'shop',
      paymentMethod: 'card',
      subtotalInr: 18500,
      discountInr: 1850,
      gstInr: 2997,
      totalInr: 19647,
      referenceId: 'SHP-USC-401',
      description: 'Babolat Pure Aero 98 Racket — Mehak Malhotra (Gold 10% off)',
      dateKey: today,
    },
    {
      id: 'usc-tx-12',
      source: 'shop',
      paymentMethod: 'upi',
      subtotalInr: 14200,
      discountInr: 1420,
      gstInr: 2300,
      totalInr: 15080,
      referenceId: 'SHP-USC-402',
      description: 'Yonex Astrox 88D Pro Racket — Gurpreet Kaur Sandhu (Online Club Collect)',
      dateKey: addDaysToDateKey(today, -2),
    },
    {
      id: 'usc-tx-13',
      source: 'shop',
      paymentMethod: 'upi',
      subtotalInr: 11499,
      discountInr: 575,
      gstInr: 1966,
      totalInr: 12890,
      referenceId: 'SHP-USC-403',
      description: 'ASICS Gel-Resolution 9 Shoes — Saurabh Tiwari (Chandigarh Delivery)',
      dateKey: addDaysToDateKey(today, -5),
    },
    {
      id: 'usc-tx-14',
      source: 'bar',
      paymentMethod: 'upi',
      subtotalInr: 4280,
      discountInr: 642,
      gstInr: 182,
      totalInr: 3820,
      referenceId: 'BAR-USC-801',
      description: 'Table 6 Box Cricket Squad Tab — Simranjit Singh Bains (Gold 15% off)',
      dateKey: today,
    },
    {
      id: 'usc-tx-15',
      source: 'bar',
      paymentMethod: 'card',
      subtotalInr: 2940,
      discountInr: 441,
      gstInr: 125,
      totalInr: 2624,
      referenceId: 'BAR-USC-802',
      description: 'Terrace Table 2 Post-Padel Social Tab — Vikramjit Singh Sidhu',
      dateKey: addDaysToDateKey(today, -1),
    },
    {
      id: 'usc-tx-16',
      source: 'bar',
      paymentMethod: 'cash',
      subtotalInr: 1860,
      discountInr: 186,
      gstInr: 84,
      totalInr: 1758,
      referenceId: 'BAR-USC-803',
      description: 'Morning Café Cold Brews & Protein Wraps — Counter Register',
      dateKey: today,
    },
  ];
}
