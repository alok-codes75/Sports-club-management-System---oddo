import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useScroll, useSpring } from 'motion/react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { ArrowRight, Menu, X } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '@/src/services/firebase';
import { useAuth } from '@/src/contexts/AuthContext';
import { CLUB_IMAGES } from '@/src/config/clubImages';
import { ClubLogo } from '@/src/components/common/ClubLogo';
import {
  type Court,
  type MembershipTier,
  type Product,
  type PublicScheduleSlot,
  type SocialSession,
  type SportType,
} from '@/src/types/club';
import { getNextSevenDays } from '@/src/utils/clubHelpers';
import { FacilitiesShowcase } from '@/src/components/public/FacilitiesShowcase';
import { LiveCourtsSection, type DayPeriod } from '@/src/components/public/LiveCourtsSection';
import { PlansAndShopSection } from '@/src/components/public/PlansAndShopSection';
import { EnquiryFormSection } from '@/src/components/public/EnquiryFormSection';

interface PublicWebsiteProps {
  onOpenMemberLogin: () => void;
  onOpenMemberSignUp: () => void;
  onOpenAdminLogin: () => void;
  onOpenDashboard: () => void;
}

const NAV_LINKS = [
  { href: '#facilities', label: 'Facilities' },
  { href: '#courts', label: 'Courts' },
  { href: '#plans', label: 'Plans' },
  { href: '#shop', label: 'Gear Shop' },
  { href: '#enquire', label: 'Enquire' },
] as const;

const HERO_HIGHLIGHTS = [
  {
    code: '01. ZERO DOUBLE-BOOKINGS',
    text: '1-hour sessions open every 30 min with atomic slot locks across walk-ins and members.',
  },
  {
    code: '02. AUTOMATIC TIER PERKS',
    text: 'Gold, Silver, and Junior (<18) discounts apply silently at courts, gear shop, and bar.',
  },
  {
    code: '03. ONE SHARED SHELF',
    text: 'Counter emergencies and sofa online orders deduct from the exact same live inventory.',
  },
  {
    code: '04. POST-MATCH BAR & TABS',
    text: 'Run a table tab, track kitchen tickets live, and settle via UPI, Card, or Cash.',
  },
] as const;

export function PublicWebsite({
  onOpenMemberLogin,
  onOpenMemberSignUp,
  onOpenAdminLogin,
  onOpenDashboard,
}: PublicWebsiteProps) {
  const { firebaseUser, profile, authError, clearAuthError } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { scrollYProgress } = useScroll();
  const scrollScaleX = useSpring(scrollYProgress, {
    stiffness: 260,
    damping: 32,
    restDelta: 0.001,
  });

  const [courts, setCourts] = useState<Court[]>([]);
  const [scheduleSlots, setScheduleSlots] = useState<PublicScheduleSlot[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [socialSessions, setSocialSessions] = useState<SocialSession[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const sevenDays = useMemo(() => getNextSevenDays(), []);
  const [selectedDate, setSelectedDate] = useState<string>(sevenDays[0].dateKey);
  const [selectedSport, setSelectedSport] = useState<SportType | 'all'>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<DayPeriod>('evening');

  const [enquiryTab, setEnquiryTab] = useState<'trial' | 'enquiry'>('trial');
  const [interestedSport, setInterestedSport] = useState<SportType | 'all'>('tennis');
  const [interestedTier, setInterestedTier] = useState<MembershipTier | 'undecided'>('gold');
  const [preferredDate, setPreferredDate] = useState(sevenDays[0].dateKey);
  const [preferredSlot, setPreferredSlot] = useState('18:00');
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  useEffect(() => {
    const unsubCourts = onSnapshot(
      collection(db, 'courts'),
      (snap) => {
        const items = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Court, 'id'>) }))
          .filter((c) => c.active);
        setCourts(items);
        setDataLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'courts')
    );

    const unsubProducts = onSnapshot(
      collection(db, 'products'),
      (snap) => {
        const items = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Product, 'id'>) }))
          .filter((p) => p.active);
        setProducts(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'products')
    );

    const unsubSocial = onSnapshot(
      collection(db, 'socialSessions'),
      (snap) => {
        const items = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<SocialSession, 'id'>) }))
          .filter((s) => s.status === 'open' || s.status === 'full');
        setSocialSessions(items);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'socialSessions')
    );

    return () => {
      unsubCourts();
      unsubProducts();
      unsubSocial();
    };
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'publicSchedule'), where('date', '==', selectedDate));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const slots = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<PublicScheduleSlot, 'id'>) }))
          .filter((s) => s.status !== 'cancelled');
        setScheduleSlots(slots);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'publicSchedule')
    );
    return () => unsub();
  }, [selectedDate]);

  const handleSelectSlotForTrial = (sport: SportType, slot: string) => {
    setEnquiryTab('trial');
    setInterestedSport(sport);
    setPreferredDate(selectedDate);
    setPreferredSlot(slot);
    setSubmittedRef(null);
    document.getElementById('enquire')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectPlanForEnquiry = (tier: MembershipTier) => {
    setEnquiryTab('enquiry');
    setInterestedTier(tier);
    setSubmittedRef(null);
    document.getElementById('enquire')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-30 bg-white/92 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-8">
          <a href="#top" className="focus:outline-none">
            <ClubLogo size="md" />
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="nav-underline py-1 hover:text-blue-700 transition-colors duration-200 whitespace-nowrap shrink-0"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            {firebaseUser ? (
              <motion.button
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.16 }}
                onClick={onOpenDashboard}
                className="group hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs hover:shadow-md transition-all duration-200 whitespace-nowrap shrink-0"
              >
                {profile?.role === 'member' ? 'Member Dashboard' : 'Open Dashboard'}
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </motion.button>
            ) : (
              <motion.button
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.16 }}
                onClick={onOpenMemberLogin}
                className="group hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs hover:shadow-md transition-all duration-200 whitespace-nowrap shrink-0"
              >
                Sign In / Sign Up
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </motion.button>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 text-slate-700 hover:text-blue-700 hover:border-blue-300 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <motion.div
          style={{ scaleX: scrollScaleX }}
          className="h-[2px] bg-gradient-to-r from-blue-700 via-blue-500 to-lime-500 origin-left"
        />

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden overflow-hidden border-t border-slate-200 bg-white"
            >
              <div className="px-4 py-4 space-y-1">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
                <div className="pt-3 mt-2 border-t border-slate-200 grid grid-cols-1 gap-2">
                  {firebaseUser ? (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onOpenDashboard();
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
                    >
                      {profile?.role === 'member' ? 'Member Dashboard' : 'Open Dashboard'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          onOpenMemberSignUp();
                        }}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
                      >
                        New Member Sign Up
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            onOpenMemberLogin();
                          }}
                          className="px-3 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg"
                        >
                          Member Sign In
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            onOpenAdminLogin();
                          }}
                          className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg"
                        >
                          Admin Login
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {authError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
          <div className="flex items-center justify-between gap-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
            <span>{authError}</span>
            <button
              type="button"
              onClick={clearAuthError}
              className="text-xs font-semibold underline whitespace-nowrap"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <section
        id="top"
        className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-blue-50/75 via-white to-slate-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-14 sm:pt-12 sm:pb-16 lg:pt-16 lg:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6 flex flex-col justify-between"
            >
              <div>
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.04 }}
                  className="text-xs font-semibold text-blue-700 mb-3"
                >
                  Tennis · Cricket · Padel · Badminton · Sector 34, Chandigarh, Punjab
                </motion.p>
                <motion.h1
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.32, delay: 0.08 }}
                  className="font-display font-bold tracking-tight text-slate-900 leading-[1.02] mb-5"
                  style={{ fontSize: 'clamp(2.5rem, 4.8vw, 4.25rem)', textWrap: 'balance' }}
                >
                  Play Harder. Book Instantly. Stay for the Clubhouse.
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.32, delay: 0.14 }}
                  className="text-base text-slate-600 leading-relaxed max-w-xl mb-8"
                >
                  Eight championship courts with zero double-booking, one shared pro-gear shelf for
                  counter and online orders, post-match bar tabs with automatic member savings, and
                  real-time availability from 06:00 to 22:00.
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, delay: 0.2 }}
                className="space-y-5"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <motion.button
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.16 }}
                    onClick={onOpenMemberSignUp}
                    className="group inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-sm hover:shadow-lg hover:shadow-blue-700/20 transition-all duration-200 whitespace-nowrap"
                  >
                    New Member Sign Up
                    <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.16 }}
                    onClick={onOpenMemberLogin}
                    className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-900 bg-white border border-slate-300 hover:border-blue-600 hover:text-blue-700 hover:shadow-sm rounded-xl transition-all duration-200 whitespace-nowrap"
                  >
                    Member Sign In
                  </motion.button>
                  <motion.button
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.16 }}
                    onClick={onOpenAdminLogin}
                    className="inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 rounded-xl transition-all duration-200 whitespace-nowrap"
                  >
                    Admin &amp; Staff Login
                  </motion.button>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-2">
                  <span>Open daily 06:00–22:00</span>
                  <span aria-hidden="true">·</span>
                  <span>UPI, Card &amp; Cash (INR)</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">+91 9234406164</span>
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -3 }}
              className="group lg:col-span-6 relative rounded-2xl overflow-hidden border border-slate-200 hover:border-blue-300 hover:shadow-xl hover:shadow-slate-900/10 transition-all duration-300 min-h-[320px] sm:min-h-[360px] lg:min-h-[420px] bg-slate-900"
            >
              <img
                src={CLUB_IMAGES.hero}
                alt="Udaan Sports Club sunlit championship blue tennis courts, panoramic glass padel courts, and clubhouse pavilion in Chandigarh"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent transition-opacity duration-300" />
              <div className="absolute bottom-0 inset-x-0 p-5 sm:p-6 text-white flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <div className="text-xs font-mono text-lime-300 mb-1">LIVE CLUB SCHEDULE</div>
                  <div className="font-display text-2xl sm:text-[26px] font-bold tracking-tight">
                    {dataLoading
                      ? '8 Championship Courts · 4 Sports'
                      : `${courts.length || 8} Active Courts · ${products.length || 8} Pro Shop SKUs`}
                  </div>
                </div>
                <a
                  href="#courts"
                  className="group/cta inline-flex items-center gap-1.5 text-xs font-semibold text-slate-950 bg-lime-400 hover:bg-lime-300 px-3.5 py-2 rounded-lg shadow-sm transition-all duration-200 hover:-translate-y-0.5 whitespace-nowrap self-start sm:self-auto"
                >
                  Check Free Slots
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover/cta:translate-x-1" />
                </a>
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mt-12 pt-8 border-t border-slate-200">
            {HERO_HIGHLIGHTS.map((item, idx) => (
              <motion.div
                key={item.code}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.28, delay: idx * 0.05 }}
                whileHover={{ y: -4 }}
                className="p-4 rounded-xl border border-transparent bg-white/60 hover:bg-white hover:border-blue-200 hover:shadow-md hover:shadow-slate-900/5 transition-all duration-200"
              >
                <p className="text-xs font-mono text-blue-700 mb-1.5">{item.code}</p>
                <p className="text-sm font-semibold text-slate-900 leading-snug">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <FacilitiesShowcase onSelectSport={(sport) => setSelectedSport(sport)} />

      <LiveCourtsSection
        courts={courts}
        scheduleSlots={scheduleSlots}
        loading={dataLoading}
        sevenDays={sevenDays}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        selectedSport={selectedSport}
        onSelectSport={setSelectedSport}
        selectedPeriod={selectedPeriod}
        onSelectPeriod={setSelectedPeriod}
        onSelectSlotForTrial={handleSelectSlotForTrial}
        onOpenAdminLogin={onOpenAdminLogin}
      />

      <PlansAndShopSection
        products={products}
        socialSessions={socialSessions}
        onSelectPlanForEnquiry={handleSelectPlanForEnquiry}
        onOpenMemberLogin={onOpenMemberLogin}
        onOpenMemberSignUp={onOpenMemberSignUp}
        onRequestTrialSpot={() => setEnquiryTab('trial')}
      />

      <EnquiryFormSection
        sevenDays={sevenDays}
        enquiryTab={enquiryTab}
        onChangeTab={setEnquiryTab}
        interestedSport={interestedSport}
        onChangeSport={setInterestedSport}
        interestedTier={interestedTier}
        onChangeTier={setInterestedTier}
        preferredDate={preferredDate}
        onChangeDate={setPreferredDate}
        preferredSlot={preferredSlot}
        onChangeSlot={setPreferredSlot}
        submittedRef={submittedRef}
        onSetSubmittedRef={setSubmittedRef}
      />

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-5 text-xs text-slate-500">
          <a href="#top" className="focus:outline-none">
            <ClubLogo size="sm" />
          </a>
          <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-6">
            <a href="#courts" className="nav-underline hover:text-slate-900 transition-colors">
              Courts
            </a>
            <a href="#plans" className="nav-underline hover:text-slate-900 transition-colors">
              Memberships
            </a>
            <a href="#shop" className="nav-underline hover:text-slate-900 transition-colors">
              Gear Shop
            </a>
            <button
              type="button"
              onClick={onOpenMemberLogin}
              className="font-semibold text-blue-700 hover:text-blue-800 hover:underline transition-colors"
            >
              Member Sign In / Sign Up
            </button>
            <button
              type="button"
              onClick={onOpenAdminLogin}
              className="font-semibold text-slate-800 hover:text-blue-700 hover:underline transition-colors"
            >
              Admin &amp; Staff Login
            </button>
          </div>
          <div className="text-center md:text-right">
            © {new Date().getFullYear()} Udaan Sports Club Pvt. Ltd. · Chandigarh, Punjab
          </div>
        </div>
      </footer>
    </div>
  );
}
