import React, { useEffect, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { Check, Shield } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '@/src/services/firebase';
import { useAuth } from '@/src/contexts/AuthContext';
import { ROLE_LABELS, type UserProfile, type UserRole } from '@/src/types/club';

const ROLES: UserRole[] = ['owner', 'front_desk', 'bar_staff', 'member'];

export function RoleAccessView() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setUsers(snap.docs.map((d) => d.data() as UserProfile));
        setLoading(false);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'users')
    );
    return () => unsub();
  }, []);

  const handleRoleChange = async (targetUser: UserProfile, newRole: UserRole) => {
    if (targetUser.role === newRole) return;
    setUpdatingUid(targetUser.uid);
    setFeedback(null);
    try {
      await updateDoc(doc(db, 'users', targetUser.uid), {
        role: newRole,
        updatedAt: serverTimestamp(),
      });
      setFeedback(`Updated ${targetUser.displayName} to ${ROLE_LABELS[newRole]}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUser.uid}`);
    } finally {
      setUpdatingUid(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900">
              Role-Based Access Control (RBAC)
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Roles assigned here are enforced directly in Cloud Firestore security rules—staff only
              access the operational modules matching their duties.
            </p>
          </div>
          <Shield className="w-5 h-5 text-blue-700 shrink-0" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-200 text-xs">
          <div>
            <div className="font-semibold text-slate-900 mb-1">Club Owner</div>
            <p className="text-slate-600">
              Full finance, payroll, leave approvals, corporate invoicing, court setup, and role management.
            </p>
          </div>
          <div>
            <div className="font-semibold text-slate-900 mb-1">Front Desk Staff</div>
            <p className="text-slate-600">
              Member enrollment, walk-in court bookings, gear shop counter POS, and visitor Lead CRM.
            </p>
          </div>
          <div>
            <div className="font-semibold text-slate-900 mb-1">Bar & Kitchen Staff</div>
            <p className="text-slate-600">
              Table orders, open member tabs, kitchen display queue, and daily bar shift closing.
            </p>
          </div>
          <div>
            <div className="font-semibold text-slate-900 mb-1">Club Member</div>
            <p className="text-slate-600">
              Self-service court bookings (max 2/day), Friday Social Play, online gear orders, and own history.
            </p>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-lg">
          <Check className="w-4 h-4" />
          <span>{feedback}</span>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            <div className="h-10 bg-slate-100 rounded animate-pulse" />
            <div className="h-10 bg-slate-100 rounded animate-pulse" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                  <th className="py-3 px-4 font-semibold">Account</th>
                  <th className="py-3 px-4 font-semibold">Email</th>
                  <th className="py-3 px-4 font-semibold">Current Role</th>
                  <th className="py-3 px-4 font-semibold text-right">Assign Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((u) => {
                  const isSelf = u.uid === profile?.uid;
                  return (
                    <tr key={u.uid} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {u.displayName} {isSelf ? '(You)' : ''}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-600">{u.email}</td>
                      <td className="py-3 px-4 text-xs font-semibold text-blue-700">
                        {ROLE_LABELS[u.role]}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <select
                          disabled={updatingUid === u.uid || isSelf}
                          value={u.role}
                          onChange={(e) => void handleRoleChange(u, e.target.value as UserRole)}
                          className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
