import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { collection, limit, onSnapshot, query } from 'firebase/firestore';
import {
  BarChart3,
  CalendarDays,
  Database,
  Globe,
  LogOut,
  Shield,
  ShoppingBag,
  UserCheck,
  UserCircle2,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '@/src/services/firebase';
import { useAuth } from '@/src/contexts/AuthContext';
import { ClubLogo } from '@/src/components/common/ClubLogo';
import { seedInitialClubData } from '@/src/services/seedData';
import {
  ROLE_LABELS,
  type Enquiry,
  type MembershipTier,
  type UserRole,
} from '@/src/types/club';
import { OwnerFinanceHrView } from '@/src/modules/finance/OwnerFinanceHrView';
import { CourtBookingView } from '@/src/modules/bookings/CourtBookingView';
import { MembersDirectoryView } from '@/src/modules/members/MembersDirectoryView';
import { GearShopView } from '@/src/modules/shop/GearShopView';
import { BarPosView } from '@/src/modules/bar/BarPosView';
import { LeadCrmView } from '@/src/modules/crm/LeadCrmView';
import { RoleAccessView } from '@/src/modules/admin/RoleAccessView';

type AdminTab = 'owner' | 'bookings' | 'members' | 'shop' | 'bar' | 'crm' | 'roles';

interface WorkspaceShellProps {
  onViewPublicSite: () => void;
  onOpenMemberPortal: () => void;
}

interface NavItem {
  id: AdminTab;
  label: string;
  group: 'Command' | 'Daily Operations' | 'Administration';
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'owner',
    label: 'Owner Finance & HR',
    group: 'Command',
    icon: BarChart3,
    allowedRoles: ['owner'],
  },
  {
    id: 'bookings',
    label: 'Court Bookings',
    group: 'Daily Operations',
    icon: CalendarDays,
    allowedRoles: ['owner', 'front_desk'],
  },
  {
    id: 'members',
    label: 'Member Directory',
    group: 'Daily Operations',
    icon: Users,
    allowedRoles: ['owner', 'front_desk'],
  },
  {
    id: 'shop',
    label: 'Gear Shop & POS',
    group: 'Daily Operations',
    icon: ShoppingBag,
    allowedRoles: ['owner', 'front_desk'],
  },
  {
    id: 'bar',
    label: 'Bar POS & Kitchen',
    group: 'Daily Operations',
    icon: UtensilsCrossed,
    allowedRoles: ['owner', 'bar_staff'],
  },
  {
    id: 'crm',
    label: 'Lead & Trial CRM',
    group: 'Daily Operations',
    icon: UserCheck,
    allowedRoles: ['owner', 'front_desk'],
  },
  {
    id: 'roles',
    label: 'Team Roles & RBAC',
    group: 'Administration',
    icon: Shield,
    allowedRoles: ['owner'],
  },
];

function getDefaultTabForRole(role: UserRole): AdminTab {
  if (role === 'owner') return 'owner';
  if (role === 'bar_staff') return 'bar';
  return 'bookings';
}

export function AdminWorkspace({
  onViewPublicSite,
  onOpenMemberPortal,
}: WorkspaceShellProps) {
  const { firebaseUser, profile, effectiveRole, previewRole, setPreviewRole, signOut } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>(() => getDefaultTabForRole(effectiveRole));
  const [courtsEmpty, setCourtsEmpty] = useState(false);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [staffCount, setStaffCount] = useState<number | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  const [convertPrefill, setConvertPrefill] = useState<{
    fullName: string;
    email: string;
    phone: string;
    tier: MembershipTier;
    sourceEnquiryId?: string;
  } | null>(null);

  const visibleNav = useMemo(
    () => NAV_ITEMS.filter((item) => item.allowedRoles.includes(effectiveRole)),
    [effectiveRole]
  );

  // If owner previews Member role, offer immediate handoff or show clean preview banner
  useEffect(() => {
    if (visibleNav.length > 0 && !visibleNav.some((n) => n.id === activeTab)) {
      setActiveTab(getDefaultTabForRole(effectiveRole));
    }
  }, [effectiveRole, activeTab, visibleNav]);

  useEffect(() => {
    const qCourts = query(collection(db, 'courts'), limit(1));
    const unsubCourts = onSnapshot(
      qCourts,
      (snap) => setCourtsEmpty(snap.empty),
      (err) => handleFirestoreError(err, OperationType.LIST, 'courts')
    );

    const unsubMembers = onSnapshot(
      collection(db, 'members'),
      (snap) => setMemberCount(snap.size),
      (err) => handleFirestoreError(err, OperationType.LIST, 'members')
    );

    let unsubStaff: (() => void) | null = null;
    if (profile?.role === 'owner') {
      unsubStaff = onSnapshot(
        collection(db, 'staffRecords'),
        (snap) => setStaffCount(snap.size),
        (err) => handleFirestoreError(err, OperationType.LIST, 'staffRecords')
      );
    }

    return () => {
      unsubCourts();
      unsubMembers();
      if (unsubStaff) unsubStaff();
    };
  }, [profile?.role]);

  const needsFullUdaanData =
    courtsEmpty ||
    (memberCount !== null && memberCount < 50) ||
    (staffCount !== null && staffCount < 20);

  const handleSeedClub = async () => {
    if (!firebaseUser) return;
    setSeeding(true);
    setSeedMessage(null);
    try {
      const res = await seedInitialClubData(firebaseUser.uid);
      setSeedMessage(res.summary);
    } finally {
      setSeeding(false);
    }
  };

  const handleConvertLead = (lead: Enquiry) => {
    const targetTier: MembershipTier =
      lead.interestedTier === 'gold' ||
      lead.interestedTier === 'silver' ||
      lead.interestedTier === 'junior'
        ? lead.interestedTier
        : 'gold';

    setConvertPrefill({
      fullName: lead.visitorName,
      email: lead.email,
      phone: lead.phone,
      tier: targetTier,
      sourceEnquiryId: lead.id,
    });
    setActiveTab('members');
  };

  const currentNav = NAV_ITEMS.find((n) => n.id === activeTab);
  const groups: Array<'Command' | 'Daily Operations' | 'Administration'> = [
    'Command',
    'Daily Operations',
    'Administration',
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      {/* Fixed 264px Operations Sidebar */}
      <aside className="w-full lg:w-[264px] bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col justify-between shrink-0">
        <div>
          <div className="h-16 px-4 border-b border-slate-200 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onViewPublicSite}
              className="focus:outline-none text-left min-w-0"
            >
              <ClubLogo size="sm" />
            </button>
            <span className="font-mono text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">
              ADMIN
            </span>
          </div>

          <div className="p-3 space-y-5">
            {groups.map((group) => {
              const items = visibleNav.filter((item) => item.group === group);
              if (items.length === 0) return null;
              return (
                <div key={group}>
                  <div className="px-3 mb-1.5 text-[11px] font-semibold text-slate-400">
                    {group}
                  </div>
                  <nav className="space-y-1">
                    {items.map((item) => {
                      const Icon = item.icon;
                      const active = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveTab(item.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                            active
                              ? 'bg-blue-50 text-blue-700 font-semibold'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </nav>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-200 space-y-3">
          {profile?.role === 'owner' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Owner Role Preview
              </label>
              <select
                value={previewRole ?? 'owner'}
                onChange={(e) => {
                  const val = e.target.value as UserRole;
                  if (val === 'member') {
                    setPreviewRole(null);
                    onOpenMemberPortal();
                    return;
                  }
                  setPreviewRole(val === 'owner' ? null : val);
                }}
                className="w-full px-2.5 py-1.5 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="owner">Club Owner (Full Access)</option>
                <option value="front_desk">Front Desk Staff View</option>
                <option value="bar_staff">Bar &amp; Kitchen Staff View</option>
                <option value="member">Switch to Member Dashboard</option>
              </select>
            </div>
          )}

          <div className="text-xs">
            <div className="font-semibold text-slate-900 truncate">{profile?.displayName}</div>
            <div className="text-slate-500 truncate">
              {ROLE_LABELS[effectiveRole]} · <span className="font-mono">{profile?.email}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenMemberPortal}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap"
          >
            <UserCircle2 className="w-3.5 h-3.5" />
            Open Member Portal
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onViewPublicSite}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:border-slate-400 rounded-lg transition-colors whitespace-nowrap"
            >
              <Globe className="w-3.5 h-3.5" />
              Public Site
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:border-red-300 hover:text-red-700 rounded-lg transition-colors whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Operations Canvas */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="text-slate-400 whitespace-nowrap">Admin Console</span>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-900 truncate">
              {currentNav?.label ?? 'Operations'}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {profile?.role === 'owner' && (
              <button
                type="button"
                disabled={seeding}
                onClick={() => void handleSeedClub()}
                className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap disabled:opacity-60 ${
                  needsFullUdaanData
                    ? 'text-white bg-blue-700 hover:bg-blue-800'
                    : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                {seeding
                  ? 'Loading Udaan Data...'
                  : needsFullUdaanData
                  ? 'Load Full Udaan Data (75 Members · 25 Staff)'
                  : 'Sync Udaan Dataset'}
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-6 max-w-[1440px] w-full mx-auto space-y-6">
          {seedMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-4 py-3 rounded-lg">
              {seedMessage}
            </div>
          )}

          {profile?.role === 'owner' && needsFullUdaanData && !seedMessage && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900">
                  Load Full Udaan Sports Club (Chandigarh, Punjab) Enterprise Data
                </h2>
                <p className="text-xs text-slate-700 mt-0.5">
                  Safely adds 75 Indian club members (Gold, Silver &amp; Junior), 25 salaried
                  employees across all 5 departments, 8 Chandigarh/Punjab corporate GST invoices,
                  10 CRM leads, leave requests, and INR ledger entries without deleting existing
                  records.
                </p>
              </div>
              <button
                type="button"
                disabled={seeding}
                onClick={() => void handleSeedClub()}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                {seeding ? 'Loading 75 Members & 25 Staff...' : 'Load Full Udaan Data'}
              </button>
            </div>
          )}

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === 'owner' && <OwnerFinanceHrView />}
            {activeTab === 'bookings' && <CourtBookingView mode="staff" />}
            {activeTab === 'members' && (
              <MembersDirectoryView
                prefill={convertPrefill}
                onClearPrefill={() => setConvertPrefill(null)}
              />
            )}
            {activeTab === 'shop' && <GearShopView mode="staff" />}
            {activeTab === 'bar' && <BarPosView />}
            {activeTab === 'crm' && <LeadCrmView onConvertLead={handleConvertLead} />}
            {activeTab === 'roles' && <RoleAccessView />}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
