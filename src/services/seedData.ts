import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/src/services/firebase';
import { CLUB_BRAND } from '@/src/config/clubBrand';
import {
  buildUdaanEnquiries,
  buildUdaanInvoices,
  buildUdaanLeaves,
  buildUdaanMembers,
  buildUdaanStaff,
  buildUdaanTransactions,
} from '@/src/data/udaanSeedCatalog';
import { addDaysToDateKey, getDateKey, getNextFridayDateKey } from '@/src/types/club';

interface BatchWriteOp {
  collectionName: string;
  docId: string;
  data: Record<string, unknown>;
}

const MAX_BATCH_OPS = 400;

async function getExistingDocIds(collectionName: string): Promise<Set<string>> {
  const snap = await getDocs(collection(db, collectionName));
  return new Set(snap.docs.map((d) => d.id));
}

async function commitOpsInChunks(ops: BatchWriteOp[]): Promise<void> {
  for (let i = 0; i < ops.length; i += MAX_BATCH_OPS) {
    const chunk = ops.slice(i, i + MAX_BATCH_OPS);
    const batch = writeBatch(db);
    for (const op of chunk) {
      batch.set(doc(db, op.collectionName, op.docId), op.data);
    }
    await batch.commit();
  }
}

export async function seedInitialClubData(
  ownerUid: string
): Promise<{ seeded: boolean; summary: string }> {
  try {
    const today = getDateKey(new Date());
    const tomorrow = addDaysToDateKey(today, 1);
    const nextFriday = getNextFridayDateKey();

    // Inspect existing IDs so seeding is non-destructive and safe to run anytime
    const [
      existingCourts,
      existingProducts,
      existingMenu,
      existingSocial,
      existingSchedule,
      existingMembers,
      existingStaff,
      existingInvoices,
      existingEnquiries,
      existingLeaves,
      existingTransactions,
    ] = await Promise.all([
      getExistingDocIds('courts'),
      getExistingDocIds('products'),
      getExistingDocIds('menuItems'),
      getExistingDocIds('socialSessions'),
      getExistingDocIds('publicSchedule'),
      getExistingDocIds('members'),
      getExistingDocIds('staffRecords'),
      getExistingDocIds('invoices'),
      getExistingDocIds('enquiries'),
      getExistingDocIds('leaveRequests'),
      getExistingDocIds('transactions'),
    ]);

    // Step 1: Commit courts first so dependent publicSchedule & socialSessions rules pass
    const courts = [
      {
        id: 'court-tennis-1',
        name: 'Centre Court 1',
        sport: 'tennis',
        surface: 'DecoTurf Acrylic Hard',
        indoor: false,
        hourlyRateInr: 800,
        active: true,
        notes: 'LED floodlights · Championship baseline run-off',
      },
      {
        id: 'court-tennis-2',
        name: 'Tennis Court 2',
        sport: 'tennis',
        surface: 'Synthetic Clay',
        indoor: false,
        hourlyRateInr: 750,
        active: true,
        notes: 'Shaded spectator bench · Ball machine compatible',
      },
      {
        id: 'court-cricket-1',
        name: 'Cricket Turf Arena A',
        sport: 'cricket',
        surface: 'FIFA-Grade AstroTurf',
        indoor: false,
        hourlyRateInr: 1400,
        active: true,
        notes: 'Full 6-a-side box cricket cage with digital scoreboard',
      },
      {
        id: 'court-cricket-2',
        name: 'Bowling Practice Nets B',
        sport: 'cricket',
        surface: 'Hybrid Pace & Spin Strip',
        indoor: true,
        hourlyRateInr: 650,
        active: true,
        notes: '2 lanes · Bowling machine ready',
      },
      {
        id: 'court-padel-1',
        name: 'Panoramic Padel 1',
        sport: 'padel',
        surface: 'Mondo Supercourt Turf',
        indoor: false,
        hourlyRateInr: 1000,
        active: true,
        notes: 'Tempered panoramic glass walls · Pro LED lighting',
      },
      {
        id: 'court-padel-2',
        name: 'Panoramic Padel 2',
        sport: 'padel',
        surface: 'Mondo Supercourt Turf',
        indoor: true,
        hourlyRateInr: 1100,
        active: true,
        notes: 'All-weather covered pavilion court',
      },
      {
        id: 'court-badminton-1',
        name: 'Badminton Hall 1',
        sport: 'badminton',
        surface: 'BWF Maple Wood + Yonex Mat',
        indoor: true,
        hourlyRateInr: 500,
        active: true,
        notes: 'Anti-glare side lighting · Air-cooled hall',
      },
      {
        id: 'court-badminton-2',
        name: 'Badminton Hall 2',
        sport: 'badminton',
        surface: 'BWF Maple Wood + Yonex Mat',
        indoor: true,
        hourlyRateInr: 500,
        active: true,
        notes: 'Doubles championship spec court',
      },
    ];

    const courtOps: BatchWriteOp[] = [];
    for (const c of courts) {
      if (!existingCourts.has(c.id)) {
        const { id, ...rest } = c;
        courtOps.push({
          collectionName: 'courts',
          docId: id,
          data: { ...rest, updatedAt: serverTimestamp() },
        });
      }
    }
    if (courtOps.length > 0) {
      await commitOpsInChunks(courtOps);
    }

    // Step 2: Catalog, Schedule, 75 Indian Members, 25 Staff, Invoices, CRM Leads & Ledger
    const ops: BatchWriteOp[] = [];

    const products = [
      {
        id: 'prod-racket-babolat',
        sku: 'RKT-BAB-PA98',
        name: 'Pure Aero 98 Tennis Racket',
        category: 'rackets',
        brand: 'Babolat',
        priceInr: 18500,
        stock: 6,
        lowStockThreshold: 3,
        description: 'Unstrung tournament spin frame · 305g · 98 sq in head size.',
        active: true,
      },
      {
        id: 'prod-racket-yonex',
        sku: 'RKT-YNX-AX88',
        name: 'Astrox 88D Pro Badminton Racket',
        category: 'rackets',
        brand: 'Yonex',
        priceInr: 14200,
        stock: 4,
        lowStockThreshold: 3,
        description: 'Head-heavy carbon graphite frame engineered for doubles attack.',
        active: true,
      },
      {
        id: 'prod-racket-bullpadel',
        sku: 'RKT-BPD-VTX4',
        name: 'Vertex 04 Carbon Padel Racket',
        category: 'rackets',
        brand: 'Bullpadel',
        priceInr: 16900,
        stock: 3,
        lowStockThreshold: 3,
        description: 'Diamond-shaped pro padel racket with rough TopSpin face.',
        active: true,
      },
      {
        id: 'prod-shoes-asics',
        sku: 'SHOE-ASC-GR9',
        name: 'Gel-Resolution 9 All-Court Shoes',
        category: 'shoes',
        brand: 'ASICS',
        priceInr: 11499,
        stock: 8,
        lowStockThreshold: 4,
        description: 'Lateral stability Dynawall support for hard and padel courts.',
        active: true,
      },
      {
        id: 'prod-balls-wilson',
        sku: 'BALL-WLS-USO4',
        name: 'US Open Extra Duty Tennis Balls (Can of 4)',
        category: 'balls',
        brand: 'Wilson',
        priceInr: 790,
        stock: 28,
        lowStockThreshold: 10,
        description: 'Official hard-court woven felt championship pressurized can.',
        active: true,
      },
      {
        id: 'prod-balls-shuttle',
        sku: 'BALL-YNX-AS30',
        name: 'Aerosensa 30 Feather Shuttles (Tube of 12)',
        category: 'balls',
        brand: 'Yonex',
        priceInr: 2450,
        stock: 14,
        lowStockThreshold: 6,
        description: 'Tournament-grade goose feather shuttlecocks, speed 77.',
        active: true,
      },
      {
        id: 'prod-acc-string',
        sku: 'ACC-LUX-ALU125',
        name: 'ALU Power 125 String + 10-Min Express Restring',
        category: 'accessories',
        brand: 'Luxilon',
        priceInr: 1450,
        stock: 2,
        lowStockThreshold: 5,
        description: 'Match-day snapped-string rescue · strung at pro tension.',
        active: true,
      },
      {
        id: 'prod-apparel-udaan-polo',
        sku: 'APP-USC-POLO',
        name: 'Udaan Sports Club Match Dri-Fit Polo',
        category: 'apparel',
        brand: CLUB_BRAND.name,
        priceInr: 1899,
        stock: 24,
        lowStockThreshold: 6,
        description: 'Breathable athletic mesh knit with official Udaan Sports Club crest.',
        active: true,
      },
    ];

    for (const p of products) {
      if (!existingProducts.has(p.id)) {
        const { id, ...rest } = p;
        ops.push({
          collectionName: 'products',
          docId: id,
          data: { ...rest, updatedAt: serverTimestamp() },
        });
      }
    }

    const menuItems = [
      { id: 'menu-electrolyte', name: 'Citrus Electrolyte Cooler', category: 'drinks', priceInr: 160, prepMins: 2, available: true },
      { id: 'menu-cold-brew', name: 'Single-Origin Iced Cold Brew', category: 'coffee', priceInr: 220, prepMins: 3, available: true },
      { id: 'menu-protein-shake', name: 'Whey Banana Espresso Shake', category: 'drinks', priceInr: 290, prepMins: 4, available: true },
      { id: 'menu-club-sandwich', name: 'Grilled Chicken Club Sandwich', category: 'meals', priceInr: 360, prepMins: 12, available: true },
      { id: 'menu-paneer-wrap', name: 'Tandoori Paneer Protein Wrap', category: 'meals', priceInr: 320, prepMins: 10, available: true },
      { id: 'menu-truffle-fries', name: 'Rosemary Sea-Salt Fries', category: 'snacks', priceInr: 210, prepMins: 8, available: true },
      { id: 'menu-craft-lager', name: 'House Draft Lager (500ml)', category: 'drinks', priceInr: 420, prepMins: 2, available: true },
    ];
    for (const m of menuItems) {
      if (!existingMenu.has(m.id)) {
        const { id, ...rest } = m;
        ops.push({
          collectionName: 'menuItems',
          docId: id,
          data: { ...rest, updatedAt: serverTimestamp() },
        });
      }
    }

    const socialId = `social-friday-${nextFriday}`;
    if (!existingSocial.has(socialId)) {
      ops.push({
        collectionName: 'socialSessions',
        docId: socialId,
        data: {
          title: 'Friday Night Mixed Social Play — Padel & Tennis',
          courtId: 'court-padel-1',
          courtName: 'Panoramic Padel 1',
          sport: 'padel',
          date: nextFriday,
          startTime: '19:00',
          endTime: '21:00',
          feeInr: 250,
          maxPlayers: 16,
          spotsFilled: 6,
          status: 'open',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
      });
    }
    if (!existingSchedule.has(socialId)) {
      ops.push({
        collectionName: 'publicSchedule',
        docId: socialId,
        data: {
          courtId: 'court-padel-1',
          courtName: 'Panoramic Padel 1',
          sport: 'padel',
          date: nextFriday,
          startTime: '19:00',
          endTime: '21:00',
          slotType: 'social',
          status: 'social_open',
          spotsFilled: 6,
          maxSpots: 16,
          updatedAt: serverTimestamp(),
        },
      });
    }

    const sampleSchedule = [
      {
        id: `pub-seed-t1-${today}-1800`,
        courtId: 'court-tennis-1',
        courtName: 'Centre Court 1',
        sport: 'tennis',
        date: today,
        startTime: '18:00',
        endTime: '19:00',
        slotType: 'booking',
        status: 'occupied',
      },
      {
        id: `pub-seed-c1-${today}-1900`,
        courtId: 'court-cricket-1',
        courtName: 'Cricket Turf Arena A',
        sport: 'cricket',
        date: today,
        startTime: '19:00',
        endTime: '20:00',
        slotType: 'booking',
        status: 'occupied',
      },
      {
        id: `pub-seed-b1-${tomorrow}-0730`,
        courtId: 'court-badminton-1',
        courtName: 'Badminton Hall 1',
        sport: 'badminton',
        date: tomorrow,
        startTime: '07:30',
        endTime: '08:30',
        slotType: 'booking',
        status: 'occupied',
      },
    ];
    for (const slot of sampleSchedule) {
      if (!existingSchedule.has(slot.id)) {
        const { id, ...rest } = slot;
        ops.push({
          collectionName: 'publicSchedule',
          docId: id,
          data: { ...rest, updatedAt: serverTimestamp() },
        });
      }
    }

    let addedMembers = 0;
    for (const m of buildUdaanMembers(today)) {
      if (!existingMembers.has(m.id)) {
        const { id, ...rest } = m;
        ops.push({
          collectionName: 'members',
          docId: id,
          data: { ...rest, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
        });
        addedMembers += 1;
      }
    }

    let addedStaff = 0;
    for (const s of buildUdaanStaff(today)) {
      if (!existingStaff.has(s.id)) {
        const { id, ...rest } = s;
        ops.push({
          collectionName: 'staffRecords',
          docId: id,
          data: { ...rest, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
        });
        addedStaff += 1;
      }
    }

    let addedInvoices = 0;
    for (const inv of buildUdaanInvoices(today)) {
      if (!existingInvoices.has(inv.id)) {
        const { id, ...rest } = inv;
        ops.push({
          collectionName: 'invoices',
          docId: id,
          data: { ...rest, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
        });
        addedInvoices += 1;
      }
    }

    let addedEnquiries = 0;
    for (const enq of buildUdaanEnquiries(today)) {
      if (!existingEnquiries.has(enq.id)) {
        const { id, ...rest } = enq;
        ops.push({
          collectionName: 'enquiries',
          docId: id,
          data: { ...rest, createdAt: serverTimestamp(), updatedAt: serverTimestamp() },
        });
        addedEnquiries += 1;
      }
    }

    let addedLeaves = 0;
    for (const lv of buildUdaanLeaves(today)) {
      if (!existingLeaves.has(lv.id)) {
        const { id, ...rest } = lv;
        ops.push({
          collectionName: 'leaveRequests',
          docId: id,
          data: {
            ...rest,
            staffUid: ownerUid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
        });
        addedLeaves += 1;
      }
    }

    let addedTransactions = 0;
    for (const tx of buildUdaanTransactions(today)) {
      if (!existingTransactions.has(tx.id)) {
        const { id, ...rest } = tx;
        ops.push({
          collectionName: 'transactions',
          docId: id,
          data: {
            ...rest,
            recordedByUid: ownerUid,
            createdAt: serverTimestamp(),
          },
        });
        addedTransactions += 1;
      }
    }

    if (ops.length > 0) {
      await commitOpsInChunks(ops);
    }

    const totalAdded = courtOps.length + ops.length;
    if (totalAdded === 0) {
      return {
        seeded: true,
        summary: `${CLUB_BRAND.name} dataset is already up to date in Firestore (75 Indian members, 25 salaried employees, invoices, leads & ledger).`,
      };
    }

    return {
      seeded: true,
      summary: `Loaded ${CLUB_BRAND.name} (${CLUB_BRAND.locationLabel}) data safely: +${addedMembers} Indian members, +${addedStaff} salaried employees, +${addedInvoices} GST invoices, +${addedEnquiries} CRM leads, +${addedLeaves} leave requests, and +${addedTransactions} ledger entries.`,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'members');
  }
}
