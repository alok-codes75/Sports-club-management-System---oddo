import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  Check,
  ChefHat,
  Clock,
  Minus,
  Plus,
  Receipt,
  UtensilsCrossed,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '@/src/services/firebase';
import { useAuth } from '@/src/contexts/AuthContext';
import { createBarTicket, settleOpenBarTab } from '@/src/services/clubServices';
import {
  formatInr,
  getBarDiscountPercent,
  getDateKey,
  TIER_ENTITLEMENTS,
  type BarOrder,
  type BarShift,
  type KitchenStatus,
  type Member,
  type MenuCategory,
  type MenuItem,
  type OrderLineItem,
  type PaymentMethod,
} from '@/src/types/club';

const TABLES = [
  'Table 1',
  'Table 2',
  'Table 3',
  'Table 4',
  'Table 5',
  'Table 6',
  'Terrace A',
  'Terrace B',
  'Bar Counter',
];

const NEXT_KITCHEN_STATUS: Record<KitchenStatus, KitchenStatus | null> = {
  queued: 'preparing',
  preparing: 'ready',
  ready: 'served',
  served: null,
};

export function BarPosView() {
  const { firebaseUser, profile } = useAuth();
  const [subTab, setSubTab] = useState<'pos' | 'tabs' | 'kitchen' | 'shifts'>('pos');

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [barOrders, setBarOrders] = useState<BarOrder[]>([]);
  const [barShifts, setBarShifts] = useState<BarShift[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const [menuCat, setMenuCat] = useState<MenuCategory | 'all'>('all');
  const [selectedTable, setSelectedTable] = useState('Table 1');
  const [selectedMemberId, setSelectedMemberId] = useState('walk_in');
  const [guestName, setGuestName] = useState('Walk-In Guest');
  const [ticketCart, setTicketCart] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [openingFloat, setOpeningFloat] = useState('2000');
  const [shiftNotes, setShiftNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const unsubMenu = onSnapshot(
      collection(db, 'menuItems'),
      (snap) => setMenuItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MenuItem, 'id'>) })).filter((m) => m.available)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'menuItems')
    );

    const unsubOrders = onSnapshot(
      query(collection(db, 'barOrders'), orderBy('createdAt', 'desc')),
      (snap) => setBarOrders(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BarOrder, 'id'>) }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'barOrders')
    );

    const unsubShifts = onSnapshot(
      query(collection(db, 'barShifts'), orderBy('createdAt', 'desc')),
      (snap) => setBarShifts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BarShift, 'id'>) }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'barShifts')
    );

    const unsubMembers = onSnapshot(
      collection(db, 'members'),
      (snap) => setMembers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Member, 'id'>) }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'members')
    );

    return () => {
      unsubMenu();
      unsubOrders();
      unsubShifts();
      unsubMembers();
    };
  }, []);

  const activeShift = useMemo(
    () => barShifts.find((s) => s.status === 'open') ?? null,
    [barShifts]
  );

  const selectedMember = useMemo(
    () => (selectedMemberId === 'walk_in' ? null : members.find((m) => m.id === selectedMemberId) ?? null),
    [selectedMemberId, members]
  );

  const openTabs = useMemo(
    () => barOrders.filter((o) => o.tabStatus === 'open'),
    [barOrders]
  );

  const activeKitchenTickets = useMemo(
    () => barOrders.filter((o) => o.kitchenStatus !== 'served' && o.tabStatus !== 'voided'),
    [barOrders]
  );

  const filteredMenu = useMemo(
    () => (menuCat === 'all' ? menuItems : menuItems.filter((m) => m.category === menuCat)),
    [menuItems, menuCat]
  );

  const cartLines: OrderLineItem[] = useMemo(() => {
    return Object.entries(ticketCart)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const item = menuItems.find((m) => m.id === id);
        if (!item) return null;
        return {
          productId: item.id,
          name: item.name,
          unitPriceInr: item.priceInr,
          quantity: qty,
          lineTotalInr: item.priceInr * qty,
        };
      })
      .filter((x): x is OrderLineItem => x !== null);
  }, [ticketCart, menuItems]);

  const billSummary = useMemo(() => {
    const subtotal = cartLines.reduce((sum, l) => sum + l.lineTotalInr, 0);
    const tier = selectedMember ? selectedMember.tier : 'walk_in';
    const pct = getBarDiscountPercent(tier);
    const discount = Math.round((subtotal * pct) / 100);
    const taxable = Math.max(0, subtotal - discount);
    const gst = Math.round(taxable * 0.05);
    return { subtotal, pct, discount, gst, total: taxable + gst };
  }, [cartLines, selectedMember]);

  const adjustItem = (id: string, delta: number) => {
    setTicketCart((prev) => {
      const next = Math.max(0, (prev[id] ?? 0) + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  };

  const handleStartShift = async () => {
    if (!firebaseUser) return;
    setBusy(true);
    const id = `shift-${getDateKey(new Date())}-${Date.now().toString().slice(-4)}`;
    try {
      await setDoc(doc(db, 'barShifts', id), {
        staffUid: firebaseUser.uid,
        staffName: profile?.displayName ?? 'Bar Staff',
        dateKey: getDateKey(new Date()),
        openingFloatInr: Number(openingFloat) || 2000,
        cashTotalInr: 0,
        cardTotalInr: 0,
        upiTotalInr: 0,
        ordersCount: 0,
        status: 'open',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setFeedback({ type: 'success', text: 'Bar shift started. All settled bills will tally automatically.' });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `barShifts/${id}`);
    } finally {
      setBusy(false);
    }
  };

  const handleCloseShift = async () => {
    if (!activeShift) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, 'barShifts', activeShift.id), {
        status: 'closed',
        notes: shiftNotes.trim().slice(0, 400) || 'End-of-day bar closing verified.',
        updatedAt: serverTimestamp(),
      });
      setShiftNotes('');
      setFeedback({ type: 'success', text: 'Bar shift closed and end-of-day earnings locked for the Owner.' });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `barShifts/${activeShift.id}`);
    } finally {
      setBusy(false);
    }
  };

  const handlePlaceOrder = async (settleImmediately: boolean) => {
    if (!firebaseUser || cartLines.length === 0) return;
    setBusy(true);
    setFeedback(null);
    try {
      const ticketCode = await createBarTicket({
        tableNumber: selectedTable,
        shiftId: activeShift?.id,
        member: selectedMember,
        guestName: guestName.trim() || 'Walk-In Guest',
        items: cartLines,
        settleImmediately,
        paymentMethod,
        staffUid: firebaseUser.uid,
      });
      setTicketCart({});
      setFeedback({
        type: 'success',
        text: settleImmediately
          ? `Ticket ${ticketCode} sent to Kitchen and settled via ${paymentMethod.toUpperCase()}.`
          : `Ticket ${ticketCode} sent to Kitchen under Open Tab for ${selectedTable}.`,
      });
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Order failed.' });
    } finally {
      setBusy(false);
    }
  };

  const handleSettleTab = async (order: BarOrder, pm: PaymentMethod) => {
    if (!firebaseUser) return;
    setBusy(true);
    try {
      await settleOpenBarTab({
        order,
        paymentMethod: pm,
        activeShiftId: activeShift?.id,
        staffUid: firebaseUser.uid,
      });
      setFeedback({
        type: 'success',
        text: `Settled ${order.ticketCode} (${order.guestName}) via ${pm.toUpperCase()} · ${formatInr(order.totalInr)}.`,
      });
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Settlement failed.' });
    } finally {
      setBusy(false);
    }
  };

  const handleAdvanceKitchen = async (order: BarOrder) => {
    const next = NEXT_KITCHEN_STATUS[order.kitchenStatus];
    if (!next) return;
    try {
      await updateDoc(doc(db, 'barOrders', order.id), {
        kitchenStatus: next,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `barOrders/${order.id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-slate-900">
            Bar &amp; Cafeteria POS, Open Tabs &amp; Kitchen Queue
          </h2>
          <p className="text-sm text-slate-600">
            Zero paper slips — automatic member tier discounts, tracked tables, live kitchen orders,
            and shift earnings reconciliation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
          {(
            [
              { id: 'pos', label: 'Order POS' },
              { id: 'tabs', label: `Open Tabs (${openTabs.length})` },
              { id: 'kitchen', label: `Kitchen Queue (${activeKitchenTickets.length})` },
              { id: 'shifts', label: 'Shifts & Closing' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap ${
                subTab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active Shift Bar */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-4">
        {activeShift ? (
          <>
            <div className="text-xs">
              <span className="font-semibold text-emerald-700">Active Bar Shift</span>
              <span className="text-slate-500 ml-2">
                {activeShift.staffName} · {activeShift.dateKey} · Float{' '}
                <span className="font-mono">{formatInr(activeShift.openingFloatInr)}</span>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums">
              <span>UPI: {formatInr(activeShift.upiTotalInr)}</span>
              <span>Card: {formatInr(activeShift.cardTotalInr)}</span>
              <span>Cash: {formatInr(activeShift.cashTotalInr)}</span>
              <span className="font-semibold text-blue-700">
                Total: {formatInr(activeShift.upiTotalInr + activeShift.cardTotalInr + activeShift.cashTotalInr)}
              </span>
              <button
                type="button"
                onClick={() => setSubTab('shifts')}
                className="font-sans font-semibold text-slate-700 underline"
              >
                Close Shift
              </button>
            </div>
          </>
        ) : (
          <div className="w-full flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-amber-800 font-semibold">
              No active bar shift open. Open a shift to track daily UPI, Card, and Cash totals for
              closing time.
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={openingFloat}
                onChange={(e) => setOpeningFloat(e.target.value)}
                className="w-24 px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-lg"
                placeholder="Float ₹"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleStartShift()}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg whitespace-nowrap"
              >
                Start Bar Shift
              </button>
            </div>
          </div>
        )}
      </div>

      {feedback && (
        <div
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <Check className="w-4 h-4" />
            {feedback.text}
          </span>
          <button type="button" onClick={() => setFeedback(null)} className="underline">
            Dismiss
          </button>
        </div>
      )}

      {subTab === 'pos' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Menu Picker */}
          <div className="xl:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
              {(['all', 'drinks', 'coffee', 'snacks', 'meals'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setMenuCat(cat)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize ${
                    menuCat === cat ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredMenu.map((item) => {
                const qty = ticketCart[item.id] ?? 0;
                return (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-[11px] text-slate-500 capitalize">
                        {item.category} · {item.prepMins} min prep
                      </div>
                      <div className="text-sm font-semibold text-slate-900">{item.name}</div>
                      <div className="font-mono text-xs font-semibold text-blue-700 mt-0.5">
                        {formatInr(item.priceInr)}
                      </div>
                    </div>
                    {qty === 0 ? (
                      <button
                        type="button"
                        onClick={() => adjustItem(item.id, 1)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
                      >
                        Add
                      </button>
                    ) : (
                      <div className="inline-flex items-center gap-2 border border-slate-300 rounded-lg px-2 py-1">
                        <button type="button" onClick={() => adjustItem(item.id, -1)}>
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono text-xs font-semibold">{qty}</span>
                        <button type="button" onClick={() => adjustItem(item.id, 1)}>
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ticket & Table Composer */}
          <div className="xl:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-display text-2xl font-bold text-slate-900">Table &amp; Tab Ticket</h3>
              <UtensilsCrossed className="w-4 h-4 text-blue-700" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Table</label>
                <select
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  {TABLES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Member (Silent Discount)
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="walk_in">Walk-In Guest (0%)</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} · {TIER_ENTITLEMENTS[m.tier].name} (
                      {TIER_ENTITLEMENTS[m.tier].barDiscountPercent}% off)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedMemberId === 'walk_in' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Guest Name</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
            )}

            {cartLines.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg">
                Tap drinks, coffee, or plates to build a digital kitchen order.
              </div>
            ) : (
              <div className="space-y-2 border-t border-slate-200 pt-3 text-xs">
                {cartLines.map((l) => (
                  <div key={l.productId} className="flex justify-between">
                    <span>
                      {l.name} × {l.quantity}
                    </span>
                    <span className="font-mono font-semibold">{formatInr(l.lineTotalInr)}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-slate-200 space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatInr(billSummary.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Member Bar Discount ({billSummary.pct}%)</span>
                    <span className="font-mono">− {formatInr(billSummary.discount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>F&amp;B GST (5%)</span>
                    <span className="font-mono">{formatInr(billSummary.gst)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-semibold">
                    <span>Total</span>
                    <span className="font-mono text-blue-700">{formatInr(billSummary.total)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {(['upi', 'card', 'cash'] as const).map((pm) => (
                <button
                  key={pm}
                  type="button"
                  onClick={() => setPaymentMethod(pm)}
                  className={`py-2 text-xs font-semibold uppercase rounded-lg border ${
                    paymentMethod === pm
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  {pm}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={busy || cartLines.length === 0}
                onClick={() => void handlePlaceOrder(false)}
                className="py-2.5 px-3 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 disabled:opacity-50 rounded-lg"
              >
                Open Tab &amp; Send to Kitchen
              </button>
              <button
                type="button"
                disabled={busy || cartLines.length === 0}
                onClick={() => void handlePlaceOrder(true)}
                className="py-2.5 px-3 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 rounded-lg"
              >
                Settle Now ({paymentMethod.toUpperCase()})
              </button>
            </div>
          </div>
        </div>
      )}

      {subTab === 'tabs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {openTabs.length === 0 ? (
            <div className="col-span-full bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
              <Receipt className="w-7 h-7 text-slate-300 mx-auto mb-2" />
              No open member or table tabs right now.
            </div>
          ) : (
            openTabs.map((tab) => (
              <div
                key={tab.id}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono font-semibold text-blue-700">
                      {tab.ticketCode} · {tab.tableNumber}
                    </span>
                    <span className="font-semibold text-amber-700 capitalize">
                      Kitchen: {tab.kitchenStatus}
                    </span>
                  </div>
                  <div className="font-display text-2xl font-bold text-slate-900">
                    {tab.guestName}
                  </div>
                  <div className="text-xs text-slate-500 capitalize mb-3">
                    {tab.tier.replace('_', ' ')} · Saved {formatInr(tab.discountInr)}
                  </div>
                  <ul className="text-xs text-slate-700 space-y-1 border-t border-slate-100 pt-2">
                    {tab.items.map((i, idx) => (
                      <li key={idx} className="flex justify-between">
                        <span>
                          {i.name} × {i.quantity}
                        </span>
                        <span className="font-mono">{formatInr(i.lineTotalInr)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Amount Due</span>
                    <span className="font-mono text-blue-700">{formatInr(tab.totalInr)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['upi', 'card', 'cash'] as const).map((pm) => (
                      <button
                        key={pm}
                        type="button"
                        disabled={busy}
                        onClick={() => void handleSettleTab(tab, pm)}
                        className="py-1.5 text-xs font-semibold uppercase text-white bg-slate-900 hover:bg-blue-700 rounded-lg transition-colors"
                      >
                        Pay {pm}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {subTab === 'kitchen' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {activeKitchenTickets.length === 0 ? (
            <div className="col-span-full bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
              <ChefHat className="w-7 h-7 text-slate-300 mx-auto mb-2" />
              Kitchen display is clear. Incoming bar &amp; table orders appear here instantly.
            </div>
          ) : (
            activeKitchenTickets.map((ticket) => {
              const nextState = NEXT_KITCHEN_STATUS[ticket.kitchenStatus];
              return (
                <div
                  key={ticket.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-mono font-semibold text-slate-900">
                        {ticket.ticketCode} · {ticket.tableNumber}
                      </span>
                      <span
                        className={`font-semibold uppercase text-[11px] ${
                          ticket.kitchenStatus === 'queued'
                            ? 'text-amber-700'
                            : ticket.kitchenStatus === 'preparing'
                            ? 'text-blue-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {ticket.kitchenStatus}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900 mb-3">
                      Ordered by: {ticket.guestName}
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-800 border-t border-slate-100 pt-2">
                      {ticket.items.map((item, idx) => (
                        <li key={idx} className="font-medium">
                          {item.quantity} × {item.name}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {nextState && (
                    <button
                      type="button"
                      onClick={() => void handleAdvanceKitchen(ticket)}
                      className="w-full py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg capitalize"
                    >
                      Mark {nextState}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {subTab === 'shifts' && (
        <div className="space-y-6">
          {activeShift && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-2xl font-bold text-slate-900">
                    End-of-Day Shift Reconciliation
                  </h3>
                  <p className="text-xs text-slate-500">
                    Opened by {activeShift.staffName} on {activeShift.dateKey} ·{' '}
                    {activeShift.ordersCount} settled orders
                  </p>
                </div>
                <Clock className="w-5 h-5 text-blue-700" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                  <div className="text-xs text-slate-500">UPI Earnings</div>
                  <div className="font-mono text-lg font-semibold tabular-nums">
                    {formatInr(activeShift.upiTotalInr)}
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                  <div className="text-xs text-slate-500">Card Earnings</div>
                  <div className="font-mono text-lg font-semibold tabular-nums">
                    {formatInr(activeShift.cardTotalInr)}
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                  <div className="text-xs text-slate-500">Cash in Drawer (Incl. Float)</div>
                  <div className="font-mono text-lg font-semibold tabular-nums">
                    {formatInr(activeShift.cashTotalInr + activeShift.openingFloatInr)}
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3.5">
                  <div className="text-xs text-blue-700 font-semibold">Total Bar Earnings</div>
                  <div className="font-mono text-lg font-semibold tabular-nums text-blue-900">
                    {formatInr(
                      activeShift.upiTotalInr + activeShift.cardTotalInr + activeShift.cashTotalInr
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={shiftNotes}
                  onChange={(e) => setShiftNotes(e.target.value)}
                  placeholder="Closing cash count notes or handover message..."
                  className="flex-1 px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleCloseShift()}
                  className="px-5 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg whitespace-nowrap"
                >
                  Close Shift &amp; Lock Earnings
                </button>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                  <th className="py-3 px-4 font-semibold">Date &amp; Staff</th>
                  <th className="py-3 px-4 font-semibold text-right">UPI</th>
                  <th className="py-3 px-4 font-semibold text-right">Card</th>
                  <th className="py-3 px-4 font-semibold text-right">Cash</th>
                  <th className="py-3 px-4 font-semibold text-right">Total Earned</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {barShifts.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{s.staffName}</div>
                      <div className="font-mono text-xs text-slate-500">
                        {s.dateKey} · {s.ordersCount} orders
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs">{formatInr(s.upiTotalInr)}</td>
                    <td className="py-3 px-4 text-right font-mono text-xs">{formatInr(s.cardTotalInr)}</td>
                    <td className="py-3 px-4 text-right font-mono text-xs">{formatInr(s.cashTotalInr)}</td>
                    <td className="py-3 px-4 text-right font-mono text-xs font-semibold text-slate-900">
                      {formatInr(s.upiTotalInr + s.cardTotalInr + s.cashTotalInr)}
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold capitalize">
                      <span className={s.status === 'open' ? 'text-emerald-700' : 'text-slate-600'}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
