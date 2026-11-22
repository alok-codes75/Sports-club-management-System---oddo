import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { AuthProvider, useAuth } from '@/src/contexts/AuthContext';
import { ErrorBoundary } from '@/src/components/common/ErrorBoundary';
import { ClubLogo } from '@/src/components/common/ClubLogo';
import { PublicWebsite } from '@/src/pages/PublicWebsite';
import { MemberAuthPage } from '@/src/pages/MemberAuthPage';
import { StaffLoginPage } from '@/src/pages/StaffLoginPage';
import { MemberDashboard } from '@/src/pages/MemberDashboard';
import { AdminWorkspace } from '@/src/pages/AdminWorkspace';

type AppSurface =
  | 'public'
  | 'login_member'
  | 'signup_member'
  | 'login_admin'
  | 'member_dashboard'
  | 'admin_dashboard';

function ClubRouter() {
  const { firebaseUser, profile, loading } = useAuth();
  const [surface, setSurface] = useState<AppSurface>('public');

  const isStaff =
    profile?.role === 'owner' || profile?.role === 'front_desk' || profile?.role === 'bar_staff';

  useEffect(() => {
    if (!firebaseUser || !profile) {
      if (surface === 'member_dashboard') {
        setSurface('login_member');
      } else if (surface === 'admin_dashboard') {
        setSurface('login_admin');
      }
      return;
    }

    if (surface === 'login_member' || surface === 'signup_member') {
      setSurface('member_dashboard');
    } else if (surface === 'login_admin' && isStaff) {
      setSurface('admin_dashboard');
    }
  }, [firebaseUser, profile, isStaff, surface]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="text-center space-y-3 flex flex-col items-center"
        >
          <ClubLogo size="lg" />
          <div className="text-xs text-slate-500">Connecting to club database...</div>
        </motion.div>
      </div>
    );
  }

  if (surface === 'login_member' || surface === 'signup_member') {
    return (
      <MemberAuthPage
        initialMode={surface === 'signup_member' ? 'signup' : 'signin'}
        onBackPublic={() => setSurface('public')}
        onSwitchToStaff={() => setSurface('login_admin')}
        onEnterDashboard={() => setSurface('member_dashboard')}
      />
    );
  }

  if (surface === 'login_admin') {
    return (
      <StaffLoginPage
        onBackPublic={() => setSurface('public')}
        onSwitchToMember={() =>
          setSurface(firebaseUser && profile ? 'member_dashboard' : 'login_member')
        }
        onEnterDashboard={() => setSurface('admin_dashboard')}
      />
    );
  }

  if (surface === 'member_dashboard' && firebaseUser && profile) {
    return (
      <MemberDashboard
        onViewPublicSite={() => setSurface('public')}
        onOpenAdminConsole={isStaff ? () => setSurface('admin_dashboard') : undefined}
      />
    );
  }

  if (surface === 'admin_dashboard' && firebaseUser && profile && isStaff) {
    return (
      <AdminWorkspace
        onViewPublicSite={() => setSurface('public')}
        onOpenMemberPortal={() => setSurface('member_dashboard')}
      />
    );
  }

  return (
    <PublicWebsite
      onOpenMemberLogin={() =>
        setSurface(firebaseUser && profile ? 'member_dashboard' : 'login_member')
      }
      onOpenMemberSignUp={() =>
        setSurface(firebaseUser && profile ? 'member_dashboard' : 'signup_member')
      }
      onOpenAdminLogin={() =>
        setSurface(firebaseUser && profile && isStaff ? 'admin_dashboard' : 'login_admin')
      }
      onOpenDashboard={() => {
        if (!firebaseUser || !profile) {
          setSurface('login_member');
          return;
        }
        setSurface(isStaff ? 'admin_dashboard' : 'member_dashboard');
      }}
    />
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ClubRouter />
      </AuthProvider>
    </ErrorBoundary>
  );
}
