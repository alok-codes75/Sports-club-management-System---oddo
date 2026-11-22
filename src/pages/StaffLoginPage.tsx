import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  CreditCard,
  Eye,
  EyeOff,
  ShieldCheck,
  UtensilsCrossed,
} from 'lucide-react';
import { useAuth } from '@/src/contexts/AuthContext';
import { CLUB_IMAGES } from '@/src/config/clubImages';
import { ClubLogo } from '@/src/components/common/ClubLogo';
import { ROLE_LABELS } from '@/src/types/club';

interface StaffLoginPageProps {
  onBackPublic: () => void;
  onSwitchToMember: () => void;
  onEnterDashboard: () => void;
}

export function StaffLoginPage({
  onBackPublic,
  onSwitchToMember,
  onEnterDashboard,
}: StaffLoginPageProps) {
  const {
    firebaseUser,
    profile,
    authBusy,
    authError,
    signInWithGoogle,
    signInWithEmail,
    signOut,
    clearAuthError,
  } = useAuth();

  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isAuthorizedStaff =
    profile?.role === 'owner' || profile?.role === 'front_desk' || profile?.role === 'bar_staff';

  const handleStaffEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffEmail.trim() || !staffPassword) return;
    await signInWithEmail(staffEmail, staffPassword);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row">
      <div className="relative lg:w-1/2 min-h-[280px] lg:min-h-screen overflow-hidden bg-slate-900">
        <img
          src={CLUB_IMAGES.barLounge}
          alt="Udaan Sports Club operations clubhouse bar and court view"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-blue-950/80 to-slate-900/85" />

        <div className="relative z-10 h-full flex flex-col justify-between p-8 lg:p-12 text-white">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBackPublic}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-200 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Club Website
            </button>
            <span className="font-mono text-xs text-lime-400">STAFF &amp; ADMIN CONSOLE</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="max-w-lg my-10 lg:my-0"
          >
            <div className="mb-5">
              <ClubLogo variant="dark" size="md" />
            </div>
            <p className="text-xs font-medium text-lime-400 mb-2">
              Club Owner · Front Desk · Bar &amp; Kitchen
            </p>
            <h1 className="font-display text-5xl font-bold tracking-tight leading-[1.03] mb-4">
              Unified Club Command Center.
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed mb-8">
              Replace WhatsApp court scheduling, Excel member sheets, and paper bar tickets with one
              role-secured operations console.
            </p>

            <div className="space-y-3 text-xs text-slate-200 border-t border-white/15 pt-6">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-lime-400 shrink-0" />
                <span>Front Desk: Member enrollment, court walk-ins, Lead CRM &amp; Gear POS</span>
              </div>
              <div className="flex items-center gap-3">
                <UtensilsCrossed className="w-4 h-4 text-lime-400 shrink-0" />
                <span>Bar &amp; Kitchen: Table tabs, auto member discounts, KDS queue &amp; shifts</span>
              </div>
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-lime-400 shrink-0" />
                <span>Club Owner: Unified UPI/Card/Cash ledger, GST invoices, payroll &amp; leave</span>
              </div>
            </div>
          </motion.div>

          <div className="text-xs text-slate-400">
            Protected by Firebase Authentication &amp; Role-Based Security Rules
          </div>
        </div>
      </div>

      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-md space-y-6"
        >
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1.5">Authorized Personnel Only</p>
            <h2 className="font-display text-4xl font-bold tracking-tight text-slate-900">
              Admin &amp; Staff Login
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Sign in with your verified club staff or owner account to unlock operations
              dashboards.
            </p>
          </div>

          {authError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-lg flex items-start justify-between gap-3">
              <span className="leading-relaxed">{authError}</span>
              <button type="button" onClick={clearAuthError} className="font-semibold underline shrink-0">
                Dismiss
              </button>
            </div>
          )}

          {firebaseUser && profile ? (
            isAuthorizedStaff ? (
              <div className="border border-blue-200 rounded-xl p-6 bg-blue-50/50 space-y-4">
                <div>
                  <div className="text-xs font-semibold text-blue-700">Verified Staff Session</div>
                  <div className="font-semibold text-slate-900 mt-0.5">{profile.displayName}</div>
                  <div className="text-xs font-mono text-slate-600">
                    {profile.email} · {ROLE_LABELS[profile.role]}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onEnterDashboard}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Open Admin &amp; Staff Dashboard
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
            ) : (
              <div className="border border-amber-200 rounded-xl p-6 bg-amber-50 space-y-4">
                <div>
                  <div className="text-xs font-semibold text-amber-800">Member Account Detected</div>
                  <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                    <span className="font-mono">{profile.email}</span> currently has the{' '}
                    <strong>Club Member</strong> role. Only Owner, Front Desk, or Bar Staff accounts
                    can enter the Admin Console. Ask the Club Owner to assign your staff role in Team
                    RBAC, or continue to the Member Dashboard.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onSwitchToMember}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
                >
                  Go to Member Portal Instead
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="w-full py-2 text-xs font-semibold text-amber-900 underline"
                >
                  Sign in with a Staff / Owner account
                </button>
              </div>
            )
          ) : (
            <div className="space-y-5">
              <button
                type="button"
                disabled={authBusy}
                onClick={() => void signInWithGoogle()}
                className="w-full inline-flex items-center justify-center gap-3 px-5 py-3.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-xl shadow-sm transition-all hover:-translate-y-0.5"
              >
                <ShieldCheck className="w-4 h-4 text-lime-400" />
                <span>Sign In with Staff / Owner Google Account</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="relative flex items-center py-0.5">
                <div className="flex-grow border-t border-slate-200" />
                <span className="shrink-0 px-3 text-xs text-slate-400 font-medium">
                  or staff email sign in
                </span>
                <div className="flex-grow border-t border-slate-200" />
              </div>

              <form onSubmit={handleStaffEmailSignIn} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Staff Email
                  </label>
                  <input
                    type="email"
                    required
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    placeholder="staff@udaansportsclub.in"
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={staffPassword}
                      onChange={(e) => setStaffPassword(e.target.value)}
                      placeholder="Enter staff password"
                      className="w-full pl-3.5 pr-10 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
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
                  className="w-full py-2.5 text-sm font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 rounded-xl transition-colors"
                >
                  {authBusy ? 'Verifying...' : 'Sign In with Staff Email'}
                </button>
              </form>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-600">
                Role access is verified against Firestore. Staff roles can be granted or revoked
                anytime by the Club Owner.
              </div>
            </div>
          )}

          <div className="pt-5 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500">New player or club member?</span>
            <button
              type="button"
              onClick={onSwitchToMember}
              className="font-semibold text-blue-700 hover:text-blue-800 inline-flex items-center gap-1"
            >
              Member Sign In / Sign Up
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
