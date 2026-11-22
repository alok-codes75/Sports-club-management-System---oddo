import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  ShoppingBag,
  Sparkles,
  User,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { CLUB_IMAGES } from '@/src/config/clubImages';
import { ClubLogo } from '@/src/components/common/ClubLogo';
import {
  ROLE_LABELS,
  TIER_ENTITLEMENTS,
  type MembershipTier,
  type PaymentMethod,
} from '@/src/types/club';
import { calculateAgeYears, formatInr } from '@/src/utils/clubHelpers';

interface MemberAuthPageProps {
  initialMode?: 'signin' | 'signup';
  onBackPublic: () => void;
  onSwitchToStaff: () => void;
  onEnterDashboard: () => void;
}

export function MemberAuthPage({
  initialMode = 'signin',
  onBackPublic,
  onSwitchToStaff,
  onEnterDashboard,
}: MemberAuthPageProps) {
  const {
    firebaseUser,
    profile,
    authBusy,
    authError,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
    signOut,
    clearAuthError,
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [resetSent, setResetSent] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<MembershipTier | 'none'>('none');
  const [dob, setDob] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setLocalError(null);
    setResetSent(null);
    clearAuthError();
  }, [initialMode]);

  const switchMode = (nextMode: 'signin' | 'signup') => {
    setMode(nextMode);
    setLocalError(null);
    setResetSent(null);
    clearAuthError();
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setResetSent(null);

    if (!loginEmail.trim() || !loginPassword) {
      setLocalError('Please enter both your email address and password.');
      return;
    }

    await signInWithEmail(loginEmail, loginPassword);
  };

  const handlePasswordReset = async () => {
    setLocalError(null);
    setResetSent(null);
    if (!loginEmail.trim()) {
      setLocalError('Enter your email address above first, then click Forgot Password.');
      return;
    }
    const ok = await sendPasswordReset(loginEmail);
    if (ok) {
      setResetSent(`Password reset link sent to ${loginEmail.trim()}. Check your inbox.`);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    if (fullName.trim().length < 2) {
      setLocalError('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      setLocalError('Please enter a valid email address.');
      return;
    }
    if (signupPassword.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }
    if (signupPassword !== confirmPassword) {
      setLocalError('Passwords do not match. Please re-enter carefully.');
      return;
    }

    if (selectedPlan !== 'none') {
      const cleanPhone = phone.trim();
      if (cleanPhone.length < 10 || !/^[0-9+\-\s]+$/.test(cleanPhone)) {
        setLocalError(
          'Please enter a valid mobile number (e.g. +91 98450 11223) for your membership card.'
        );
        return;
      }
      if (selectedPlan === 'junior') {
        if (!dob) {
          setLocalError('Date of birth is required to verify Junior (<18) eligibility.');
          return;
        }
        const age = calculateAgeYears(dob);
        if (age >= 18) {
          setLocalError('Junior Membership is strictly for players under 18 years old.');
          return;
        }
      }
    }

    await signUpWithEmail({
      fullName,
      email: signupEmail,
      password: signupPassword,
      phone,
      dob,
      membershipTier: selectedPlan,
      paymentMethod,
    });
  };

  const activeError = localError || authError;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      <div className="relative lg:w-5/12 xl:w-1/2 min-h-[260px] lg:min-h-screen overflow-hidden bg-slate-900">
        <img
          src={CLUB_IMAGES.hero}
          alt="Sunlit championship tennis and padel courts at Udaan Sports Club, Chandigarh"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/92 via-slate-950/50 to-blue-950/35" />

        <div className="relative z-10 h-full flex flex-col justify-between p-8 lg:p-12 text-white">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBackPublic}
              className="inline-flex items-center gap-2 text-xs font-semibold text-white/90 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Club Website
            </button>
            <span className="font-mono text-xs text-lime-300">MEMBER PORTAL</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="max-w-lg my-8 lg:my-0"
          >
            <div className="mb-5">
              <ClubLogo variant="dark" size="md" />
            </div>
            <p className="text-xs font-medium text-lime-300 mb-2">
              Gold · Silver · Junior (&lt;18) · Pay-Per-Slot Players
            </p>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight leading-[1.03] mb-4">
              {mode === 'signup'
                ? 'Join Udaan Sports Club in Under a Minute.'
                : 'Your Courts, Pro Gear & Club Perks in One Place.'}
            </h1>
            <p className="text-sm text-slate-200 leading-relaxed mb-7">
              {mode === 'signup'
                ? 'Register your player profile to reserve Tennis, Cricket, Padel, or Badminton courts instantly, activate Gold, Silver, or Junior benefits, and order from our live gear shelf.'
                : 'Sign in to book 1-hour slots opening every 30 minutes, join Friday Night Social Play, shop live gear stock, and track your club visits and bar tabs.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-100 border-t border-white/20 pt-6">
              <div className="flex items-start gap-2.5">
                <CalendarDays className="w-4 h-4 text-lime-400 shrink-0 mt-0.5" />
                <span>30-min staggered slots · up to 2 sessions/day</span>
              </div>
              <div className="flex items-start gap-2.5">
                <ShoppingBag className="w-4 h-4 text-lime-400 shrink-0 mt-0.5" />
                <span>Click &amp; Collect or Home Delivery gear orders</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-lime-400 shrink-0 mt-0.5" />
                <span>Auto Gold/Silver/Junior court, shop &amp; bar savings</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Users className="w-4 h-4 text-lime-400 shrink-0 mt-0.5" />
                <span>1-click Friday Night Social Play enrollment</span>
              </div>
            </div>
          </motion.div>

          <div className="text-xs text-slate-300">
            Udaan Sports Club Pvt. Ltd. · Sector 34 Sports Avenue, Chandigarh, Punjab
          </div>
        </div>
      </div>

      <div className="lg:w-7/12 xl:w-1/2 flex items-center justify-center p-6 sm:p-10 bg-white overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-lg space-y-6"
        >
          {!firebaseUser && (
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className={`relative py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                  mode === 'signin' ? 'text-blue-700' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode === 'signin' && (
                  <motion.span
                    layoutId="member-auth-mode-tab"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 bg-white rounded-lg shadow-sm"
                  />
                )}
                <span className="relative z-10">Member Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className={`relative py-2.5 text-sm font-semibold rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 ${
                  mode === 'signup' ? 'text-blue-700' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode === 'signup' && (
                  <motion.span
                    layoutId="member-auth-mode-tab"
                    transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    className="absolute inset-0 bg-white rounded-lg shadow-sm"
                  />
                )}
                <span className="relative z-10 inline-flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4" />
                  New Member Sign Up
                </span>
              </button>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-blue-700 mb-1">
              {mode === 'signup' ? 'New Player Registration' : 'Welcome Back, Player'}
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
              {mode === 'signup' ? 'Create Your Club Account' : 'Member Portal Sign In'}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {mode === 'signup'
                ? 'Fill in your details below to register a new member account and start booking courts.'
                : 'Sign in with your email and password or continue with Google.'}
            </p>
          </div>

          {activeError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-lg flex items-start justify-between gap-3">
              <span className="leading-relaxed">{activeError}</span>
              <button
                type="button"
                onClick={() => {
                  setLocalError(null);
                  clearAuthError();
                }}
                className="font-semibold underline shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}

          {resetSent && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{resetSent}</span>
            </div>
          )}

          {firebaseUser && profile ? (
            <div className="border border-slate-200 rounded-xl p-6 bg-slate-50 space-y-4">
              <div>
                <div className="text-xs text-slate-500">Signed in as</div>
                <div className="font-semibold text-slate-900 mt-0.5">{profile.displayName}</div>
                <div className="text-xs font-mono text-slate-600">
                  {profile.email} · {ROLE_LABELS[profile.role]}
                </div>
              </div>
              <button
                type="button"
                onClick={onEnterDashboard}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
              >
                Continue to Member Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => void signOut()}
                className="w-full py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Sign out and switch account
              </button>
            </div>
          ) : mode === 'signin' ? (
            <div className="space-y-5">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="player@example.com"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">Password</label>
                    <button
                      type="button"
                      disabled={authBusy}
                      onClick={() => void handlePasswordReset()}
                      className="text-xs font-semibold text-blue-700 hover:text-blue-800"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authBusy}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-xl shadow-sm transition-colors"
                >
                  <span>{authBusy ? 'Signing In...' : 'Sign In to Member Portal'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-slate-200" />
                <span className="shrink-0 px-3 text-xs text-slate-400 font-medium">
                  or continue with
                </span>
                <div className="flex-grow border-t border-slate-200" />
              </div>

              <button
                type="button"
                disabled={authBusy}
                onClick={() => void signInWithGoogle()}
                className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3 text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:border-blue-600 hover:text-blue-700 disabled:opacity-60 rounded-xl transition-colors"
              >
                <span>Continue with Google Account</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center text-xs text-slate-600">
                Don&apos;t have a club account yet?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="font-semibold text-blue-700 hover:text-blue-800 underline"
                >
                  Register as a New Member
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        minLength={2}
                        maxLength={100}
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Aarav Sharma"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mobile Number {selectedPlan !== 'none' ? '*' : '(Optional)'}
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required={selectedPlan !== 'none'}
                        maxLength={20}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98140 11223"
                        className="w-full pl-9 pr-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      maxLength={160}
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="aarav.sharma@example.com"
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Password * (min 6 chars)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        placeholder="Create password"
                        className="w-full pl-9 pr-9 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat password"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Select Starting Club Plan
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSelectedPlan('none')}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        selectedPlan === 'none'
                          ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">Free Player</span>
                        <span className="font-mono text-xs font-semibold text-slate-700">₹0</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Pay-per-slot · upgrade anytime
                      </div>
                    </button>

                    {(['gold', 'silver', 'junior'] as MembershipTier[]).map((tier) => {
                      const info = TIER_ENTITLEMENTS[tier];
                      const active = selectedPlan === tier;
                      return (
                        <button
                          key={tier}
                          type="button"
                          onClick={() => setSelectedPlan(tier)}
                          className={`text-left p-3 rounded-xl border transition-all ${
                            active
                              ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-slate-900">{info.name}</span>
                            <span className="font-mono text-xs font-semibold text-blue-700 tabular-nums">
                              {formatInr(info.monthlyPriceInr)}/mo
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {info.courtDiscountPercent}% court · {info.shopDiscountPercent}% shop
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedPlan !== 'none' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Date of Birth {selectedPlan === 'junior' ? '* (Under 18)' : '(Optional)'}
                      </label>
                      <input
                        type="date"
                        required={selectedPlan === 'junior'}
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono border border-slate-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Activation Payment Mode
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="upi">UPI (Instant)</option>
                        <option value="card">Credit / Debit Card</option>
                        <option value="cash">Cash at Front Desk</option>
                      </select>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authBusy}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-xl shadow-sm transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>
                    {authBusy
                      ? 'Creating Your Account...'
                      : selectedPlan === 'none'
                      ? 'Create Member Account'
                      : `Register & Activate ${TIER_ENTITLEMENTS[selectedPlan].name} (${formatInr(
                          TIER_ENTITLEMENTS[selectedPlan].monthlyPriceInr
                        )})`}
                  </span>
                </button>
              </form>

              <div className="relative flex items-center py-0.5">
                <div className="flex-grow border-t border-slate-200" />
                <span className="shrink-0 px-3 text-xs text-slate-400 font-medium">
                  or quick sign up with
                </span>
                <div className="flex-grow border-t border-slate-200" />
              </div>

              <button
                type="button"
                disabled={authBusy}
                onClick={() => void signInWithGoogle()}
                className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-2.5 text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:border-blue-600 hover:text-blue-700 disabled:opacity-60 rounded-xl transition-colors"
              >
                <span>Continue with Google Account</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center text-xs text-slate-600">
                Already a registered member?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="font-semibold text-blue-700 hover:text-blue-800 underline"
                >
                  Sign In Here
                </button>
              </div>
            </div>
          )}

          <div className="pt-5 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500">Front Desk, Bar Staff, or Club Owner?</span>
            <button
              type="button"
              onClick={onSwitchToStaff}
              className="font-semibold text-blue-700 hover:text-blue-800 inline-flex items-center gap-1"
            >
              Admin &amp; Staff Login
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
