/**
 * Firestore Security Rules Test Cases for The Champions Club.
 * Lists unauthorized read/write scenarios that firestore.rules must reject.
 *
 * Run against Firebase Local Emulator Suite when available:
 *   firebase emulators:exec --only firestore "node firestore.rules.test.ts"
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  actor: 'anonymous' | 'member_a' | 'unverified_owner' | 'bar_staff';
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
  enforcedByRule: string;
}

export const SECURITY_REGRESSION_CASES: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Self-Role Escalation on User Profile Create',
    collectionPath: '/users/member_a_uid',
    operation: 'create',
    actor: 'member_a',
    payload: {
      uid: 'member_a_uid',
      email: 'attacker@example.com',
      displayName: 'Attacker',
      role: 'owner',
      createdAt: 'SERVER_TIMESTAMP',
      updatedAt: 'SERVER_TIMESTAMP',
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'users create: role == member unless isBootstrappedOwner()',
  },
  {
    id: 2,
    name: 'Self-Role Escalation on User Profile Update',
    collectionPath: '/users/member_a_uid',
    operation: 'update',
    actor: 'member_a',
    payload: {
      role: 'front_desk',
      updatedAt: 'SERVER_TIMESTAMP',
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'users update: affectedKeys().hasOnly([displayName, photoURL, updatedAt])',
  },
  {
    id: 3,
    name: 'Shadow Field Injection on Public Enquiry',
    collectionPath: '/enquiries/enq_shadow_01',
    operation: 'create',
    actor: 'anonymous',
    payload: {
      referenceCode: 'ENQ-9999',
      enquiryType: 'trial',
      visitorName: 'Shadow User',
      email: 'shadow@example.com',
      phone: '9876543210',
      interestedSport: 'tennis',
      interestedTier: 'gold',
      stage: 'new',
      isApproved: true,
      createdAt: 'SERVER_TIMESTAMP',
      updatedAt: 'SERVER_TIMESTAMP',
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'isValidEnquiry: data.keys().hasOnly(...) rejects ghost keys',
  },
  {
    id: 4,
    name: 'Enquiry Stage Shortcutting by Public Visitor',
    collectionPath: '/enquiries/enq_shortcut_01',
    operation: 'create',
    actor: 'anonymous',
    payload: {
      referenceCode: 'ENQ-8888',
      enquiryType: 'enquiry',
      visitorName: 'Shortcut User',
      email: 'short@example.com',
      phone: '9876543210',
      interestedSport: 'cricket',
      interestedTier: 'silver',
      stage: 'converted',
      createdAt: 'SERVER_TIMESTAMP',
      updatedAt: 'SERVER_TIMESTAMP',
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'enquiries create: incoming().stage == new',
  },
  {
    id: 5,
    name: 'PII Scraping via Enquiries List Query',
    collectionPath: '/enquiries',
    operation: 'list',
    actor: 'member_a',
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'enquiries list: restricted to owner or front_desk',
  },
  {
    id: 6,
    name: 'Cross-User PII Read on Users Collection',
    collectionPath: '/users/member_b_uid',
    operation: 'get',
    actor: 'member_a',
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'users get: request.auth.uid == userId || isOwnerOrFrontDesk()',
  },
  {
    id: 7,
    name: 'Email Spoofing with Unverified Admin Token',
    collectionPath: '/members/mem_001',
    operation: 'get',
    actor: 'unverified_owner',
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'isVerified() requires request.auth.token.email_verified == true',
  },
  {
    id: 8,
    name: 'Path ID Poisoning (>128 chars or invalid chars)',
    collectionPath: `/bookings/${'a'.repeat(200)}`,
    operation: 'create',
    actor: 'member_a',
    payload: {
      courtId: 'court-tennis-1',
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'isValidId(bookingId) enforces size <= 128 and ^[a-zA-Z0-9_\\-]+$',
  },
  {
    id: 9,
    name: 'Double-Booking Overwrite on Existing SlotLock',
    collectionPath: '/slotLocks/court-tennis-1_2026-11-22_1800',
    operation: 'update',
    actor: 'member_a',
    payload: {
      bookingId: 'hijacked_booking',
      userId: 'member_a_uid',
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'slotLocks allow update: if false',
  },
  {
    id: 10,
    name: 'Terminal State Mutation on Settled Bar Order',
    collectionPath: '/barOrders/bar_order_settled_1',
    operation: 'update',
    actor: 'bar_staff',
    payload: {
      totalInr: 1,
      updatedAt: 'SERVER_TIMESTAMP',
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'barOrders update: existing().tabStatus == open (unless isOwner())',
  },
  {
    id: 11,
    name: 'Client-Forged Backdated Timestamp on Booking Create',
    collectionPath: '/bookings/bk_forged_time',
    operation: 'create',
    actor: 'member_a',
    payload: {
      courtId: 'court-tennis-1',
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: '2020-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'Temporal Integrity: incoming().createdAt == request.time',
  },
  {
    id: 12,
    name: 'Member Tampering with Gear Shop Product Price',
    collectionPath: '/products/prod_racket_01',
    operation: 'update',
    actor: 'member_a',
    payload: {
      priceInr: 1,
      updatedAt: 'SERVER_TIMESTAMP',
    },
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'products update: members may only decrement stock during checkout or blocked; priceInr immutable for non-staff',
  },
];
