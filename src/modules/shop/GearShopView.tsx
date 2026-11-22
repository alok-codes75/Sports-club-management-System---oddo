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
  where,
} from 'firebase/firestore';
import {
  AlertTriangle,
  Check,
  Minus,
  PackagePlus,
  Plus,
  ShoppingBag,
  Truck,
  X,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '@/src/services/firebase';
import { useAuth } from '@/src/contexts/AuthContext';
import { checkoutShopOrder } from '@/src/services/clubServices';
import {
  formatInr,
  getShopDiscountPercent,
  TIER_ENTITLEMENTS,
  type Member,
  type PaymentMethod,
  type PlayerTier,
  type Product,
  type ProductCategory,
  type ShopOrder,
  type ShopOrderStatus,
} from '@/src/types/club';

interface GearShopViewProps {
  mode: 'staff' | 'online';
  linkedMember?: Member | null;
}

const CATEGORIES: (ProductCategory | 'all')[] = [
  'all',
  'rackets',
  'balls',
  'shoes',
  'accessories',
  'apparel',
];

export function GearShopView({ mode, linkedMember }: GearShopViewProps) {
  const { firebaseUser, profile } = useAuth();
  const [subTab, setSubTab] = useState<'shop' | 'orders' | 'inventory'>('shop');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  const [category, setCategory] = useState<ProductCategory | 'all'>('all');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [selectedMemberId, setSelectedMemberId] = useState<string>('walk_in');
  const [walkInName, setWalkInName] = useState('Walk-In Player');
  const [fulfillment, setFulfillment] = useState<'counter_pickup' | 'club_collect' | 'delivery'>(
    mode === 'staff' ? 'counter_pickup' : 'club_collect'
  );
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Staff New SKU Modal
  const [showAddSku, setShowAddSku] = useState(false);
  const [newSku, setNewSku] = useState('');
  const [newName, setNewName] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newCat, setNewCat] = useState<ProductCategory>('rackets');
  const [newPrice, setNewPrice] = useState('');
  const [newStock, setNewStock] = useState('10');
  const [newThreshold, setNewThreshold] = useState('4');

  useEffect(() => {
    const unsubProd = onSnapshot(
      collection(db, 'products'),
      (snap) => setProducts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Product, 'id'>) }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'products')
    );

    let unsubOrders: (() => void) | null = null;
    let unsubMembers: (() => void) | null = null;

    if (firebaseUser) {
      const oq =
        mode === 'staff'
          ? query(collection(db, 'shopOrders'), orderBy('createdAt', 'desc'))
          : query(collection(db, 'shopOrders'), where('userId', '==', firebaseUser.uid));
      unsubOrders = onSnapshot(
        oq,
        (snap) => setOrders(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ShopOrder, 'id'>) }))),
        (err) => handleFirestoreError(err, OperationType.LIST, 'shopOrders')
      );

      if (mode === 'staff') {
        unsubMembers = onSnapshot(
          collection(db, 'members'),
          (snap) => setMembers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Member, 'id'>) }))),
          (err) => handleFirestoreError(err, OperationType.LIST, 'members')
        );
      }
    }

    return () => {
      unsubProd();
      if (unsubOrders) unsubOrders();
      if (unsubMembers) unsubMembers();
    };
  }, [firebaseUser, mode]);

  const lowStockProducts = useMemo(
    () => products.filter((p) => p.active && p.stock <= p.lowStockThreshold),
    [products]
  );

  const filteredProducts = useMemo(
    () =>
      products.filter(
        (p) => p.active && (category === 'all' || p.category === category)
      ),
    [products, category]
  );

  const activeBuyerMember = useMemo(() => {
    if (mode === 'online') return linkedMember ?? null;
    if (selectedMemberId === 'walk_in') return null;
    return members.find((m) => m.id === selectedMemberId) ?? null;
  }, [mode, linkedMember, selectedMemberId, members]);

  const activeTier: PlayerTier = activeBuyerMember ? activeBuyerMember.tier : 'walk_in';

  const cartLines = useMemo(() => {
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([productId, qty]) => {
        const prod = products.find((p) => p.id === productId);
        return prod ? { prod, qty } : null;
      })
      .filter((x): x is { prod: Product; qty: number } => x !== null);
  }, [cart, products]);

  const totals = useMemo(() => {
    const subtotal = cartLines.reduce((sum, l) => sum + l.prod.priceInr * l.qty, 0);
    const pct = getShopDiscountPercent(activeTier);
    const discount = Math.round((subtotal * pct) / 100);
    const taxable = Math.max(0, subtotal - discount);
    const gst = Math.round(taxable * 0.18);
    return { subtotal, pct, discount, gst, total: taxable + gst };
  }, [cartLines, activeTier]);

  const adjustCart = (product: Product, delta: number) => {
    setCart((prev) => {
      const current = prev[product.id] ?? 0;
      const next = Math.max(0, Math.min(product.stock, current + delta));
      if (next === 0) {
        const copy = { ...prev };
        delete copy[product.id];
        return copy;
      }
      return { ...prev, [product.id]: next };
    });
  };

  const handleCheckout = async () => {
    if (!firebaseUser || cartLines.length === 0) return;
    if (fulfillment === 'delivery' && deliveryAddress.trim().length < 8) {
      setFeedback({ type: 'error', text: 'Enter your complete Chandigarh / Tricity delivery address.' });
      return;
    }

    setBusy(true);
    setFeedback(null);
    try {
      const orderCode = await checkoutShopOrder({
        items: cartLines.map((l) => ({ productId: l.prod.id, quantity: l.qty })),
        userId: activeBuyerMember?.userId || firebaseUser.uid,
        memberId: activeBuyerMember?.id,
        customerName:
          activeBuyerMember?.fullName ||
          (mode === 'online' ? profile?.displayName ?? 'Club Member' : walkInName),
        tier: activeTier,
        channel: mode === 'staff' ? 'counter' : 'online',
        fulfillment,
        deliveryAddress: fulfillment === 'delivery' ? deliveryAddress : undefined,
        paymentMethod,
        recordedByUid: firebaseUser.uid,
      });

      setCart({});
      setDeliveryAddress('');
      setFeedback({
        type: 'success',
        text: `Order ${orderCode} completed! Shelf inventory decremented atomically and logged in revenue ledger.`,
      });
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Checkout failed.' });
    } finally {
      setBusy(false);
    }
  };

  const handleRestock = async (product: Product, addUnits: number) => {
    try {
      await updateDoc(doc(db, 'products', product.id), {
        stock: product.stock + addUnits,
        updatedAt: serverTimestamp(),
      });
      setFeedback({
        type: 'success',
        text: `Restocked ${product.name} (+${addUnits} units · now ${product.stock + addUnits} on shelf).`,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `products/${product.id}`);
    }
  };

  const handleUpdateOrderStatus = async (order: ShopOrder, nextStatus: ShopOrderStatus) => {
    try {
      await updateDoc(doc(db, 'shopOrders', order.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `shopOrders/${order.id}`);
    }
  };

  const handleCreateSku = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSku = newSku.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    if (cleanSku.length < 3) return;
    const id = `prod-${cleanSku.toLowerCase()}-${Date.now().toString().slice(-4)}`;
    try {
      await setDoc(doc(db, 'products', id), {
        sku: cleanSku,
        name: newName.trim().slice(0, 120),
        brand: newBrand.trim().slice(0, 60),
        category: newCat,
        priceInr: Number(newPrice) || 999,
        stock: Number(newStock) || 0,
        lowStockThreshold: Number(newThreshold) || 4,
        active: true,
        updatedAt: serverTimestamp(),
      });
      setShowAddSku(false);
      setNewSku('');
      setNewName('');
      setNewBrand('');
      setNewPrice('');
      setFeedback({ type: 'success', text: `Added ${newName.trim()} (${cleanSku}) to shared shelf.` });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `products/${id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-bold text-slate-900">
            {mode === 'staff'
              ? 'Unified Gear Shop POS & Shared Shelf Inventory'
              : 'Club Pro Gear Shop (Online Ordering)'}
          </h2>
          <p className="text-sm text-slate-600">
            {mode === 'staff'
              ? 'Counter emergency sales and member online orders pull from the exact same real-time shelf.'
              : 'Order rackets, shoes, balls, or express restringing for Club Collection or Home Delivery with automatic tier savings.'}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setSubTab('shop')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap ${
              subTab === 'shop' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            {mode === 'staff' ? 'Counter POS' : 'Shop Catalog'}
          </button>
          <button
            type="button"
            onClick={() => setSubTab('orders')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap ${
              subTab === 'orders' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            {mode === 'staff' ? `Fulfillment (${orders.length})` : `My Orders (${orders.length})`}
          </button>
          {mode === 'staff' && (
            <button
              type="button"
              onClick={() => setSubTab('inventory')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap ${
                subTab === 'inventory' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
              }`}
            >
              Stock &amp; Alerts ({lowStockProducts.length})
            </button>
          )}
        </div>
      </div>

      {mode === 'staff' && lowStockProducts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900">
          <span className="inline-flex items-center gap-2 font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            Low Shelf Alert: {lowStockProducts.map((p) => `${p.name} (${p.stock} left)`).join(' · ')}
          </span>
          <button
            type="button"
            onClick={() => setSubTab('inventory')}
            className="font-semibold underline text-amber-950"
          >
            Restock Shelf
          </button>
        </div>
      )}

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

      {subTab === 'shop' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Product Shelf Grid */}
          <div className="xl:col-span-8 space-y-4">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize whitespace-nowrap ${
                    category === c ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredProducts.map((item) => {
                const qty = cart[item.id] ?? 0;
                const low = item.stock > 0 && item.stock <= item.lowStockThreshold;
                return (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>
                          {item.brand} · <span className="font-mono">{item.sku}</span>
                        </span>
                        <span
                          className={`font-semibold ${
                            item.stock === 0
                              ? 'text-red-600'
                              : low
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {item.stock === 0 ? 'Out of stock' : `${item.stock} on shelf`}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-slate-900">{item.name}</h3>
                      {item.description && (
                        <p className="text-xs text-slate-600 mt-1 mb-4">{item.description}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <span className="font-mono text-base font-semibold tabular-nums text-slate-900">
                        {formatInr(item.priceInr)}
                      </span>
                      {qty === 0 ? (
                        <button
                          type="button"
                          disabled={item.stock === 0}
                          onClick={() => adjustCart(item, 1)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 rounded-lg"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add
                        </button>
                      ) : (
                        <div className="inline-flex items-center gap-2 border border-slate-300 rounded-lg px-2 py-1">
                          <button type="button" onClick={() => adjustCart(item, -1)}>
                            <Minus className="w-3.5 h-3.5 text-slate-600" />
                          </button>
                          <span className="font-mono text-xs font-semibold w-5 text-center">
                            {qty}
                          </span>
                          <button
                            type="button"
                            disabled={qty >= item.stock}
                            onClick={() => adjustCart(item, 1)}
                          >
                            <Plus className="w-3.5 h-3.5 text-slate-600" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Checkout Register / Online Cart */}
          <div className="xl:col-span-4 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-display text-2xl font-bold text-slate-900">
                {mode === 'staff' ? 'Counter POS Cart' : 'Your Online Order'}
              </h3>
              <ShoppingBag className="w-4 h-4 text-blue-700" />
            </div>

            {mode === 'staff' && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Link Member (Auto Discount)
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="walk_in">Walk-In Customer (0% off)</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} · {TIER_ENTITLEMENTS[m.tier].name} (
                      {TIER_ENTITLEMENTS[m.tier].shopDiscountPercent}% off)
                    </option>
                  ))}
                </select>
                {selectedMemberId === 'walk_in' && (
                  <input
                    type="text"
                    value={walkInName}
                    onChange={(e) => setWalkInName(e.target.value)}
                    placeholder="Customer name"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                )}
              </div>
            )}

            {/* Fulfillment */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Fulfillment</label>
              <div className="grid grid-cols-2 gap-2">
                {mode === 'staff' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setFulfillment('counter_pickup')}
                      className={`py-2 text-xs font-semibold rounded-lg border ${
                        fulfillment === 'counter_pickup'
                          ? 'bg-blue-700 text-white border-blue-700'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      Counter Pickup
                    </button>
                    <button
                      type="button"
                      onClick={() => setFulfillment('delivery')}
                      className={`py-2 text-xs font-semibold rounded-lg border ${
                        fulfillment === 'delivery'
                          ? 'bg-blue-700 text-white border-blue-700'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      Home Delivery
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setFulfillment('club_collect')}
                      className={`py-2 text-xs font-semibold rounded-lg border ${
                        fulfillment === 'club_collect'
                          ? 'bg-blue-700 text-white border-blue-700'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      Collect at Club
                    </button>
                    <button
                      type="button"
                      onClick={() => setFulfillment('delivery')}
                      className={`py-2 text-xs font-semibold rounded-lg border ${
                        fulfillment === 'delivery'
                          ? 'bg-blue-700 text-white border-blue-700'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      Home Delivery
                    </button>
                  </>
                )}
              </div>
              {fulfillment === 'delivery' && (
                <textarea
                  rows={2}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="House/Flat No, Sector, Chandigarh / Mohali / Panchkula PIN..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              )}
            </div>

            {/* Line Items */}
            {cartLines.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg">
                Add rackets, balls, shoes, or stringing from the shelf.
              </div>
            ) : (
              <div className="space-y-2 border-t border-slate-200 pt-3 text-xs">
                {cartLines.map(({ prod, qty }) => (
                  <div key={prod.id} className="flex justify-between gap-2">
                    <span className="text-slate-700">
                      {prod.name} × {qty}
                    </span>
                    <span className="font-mono font-semibold tabular-nums text-slate-900">
                      {formatInr(prod.priceInr * qty)}
                    </span>
                  </div>
                ))}

                <div className="pt-3 border-t border-slate-200 space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatInr(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Tier Discount ({totals.pct}%)</span>
                    <span className="font-mono">− {formatInr(totals.discount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>GST (18%)</span>
                    <span className="font-mono">{formatInr(totals.gst)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-semibold text-slate-900">
                    <span>Total Payable</span>
                    <span className="font-mono text-blue-700">{formatInr(totals.total)}</span>
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

            <button
              type="button"
              disabled={busy || cartLines.length === 0}
              onClick={() => void handleCheckout()}
              className="w-full py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 rounded-lg transition-colors"
            >
              {busy ? 'Processing Order...' : `Complete Order (${formatInr(totals.total)})`}
            </button>
          </div>
        </div>
      )}

      {subTab === 'orders' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
          {orders.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              <Truck className="w-7 h-7 text-slate-300 mx-auto mb-2" />
              No gear shop orders recorded yet.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                  <th className="py-3 px-4 font-semibold">Order &amp; Customer</th>
                  <th className="py-3 px-4 font-semibold">Channel &amp; Fulfillment</th>
                  <th className="py-3 px-4 font-semibold text-right">Total (INR)</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  {mode === 'staff' && <th className="py-3 px-4 font-semibold text-right">Fulfill</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-mono text-xs font-semibold text-blue-700">{o.orderCode}</div>
                      <div className="font-semibold text-slate-900">{o.customerName}</div>
                      <div className="text-xs text-slate-500">
                        {o.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      <div className="capitalize font-medium text-slate-800">
                        {o.channel} · {o.fulfillment.replace('_', ' ')}
                      </div>
                      {o.deliveryAddress && <div className="text-slate-500">{o.deliveryAddress}</div>}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-xs tabular-nums">
                      <div className="font-semibold text-slate-900">{formatInr(o.totalInr)}</div>
                      <div className="uppercase text-slate-500">{o.paymentMethod}</div>
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold capitalize text-slate-800">
                      {o.status.replace(/_/g, ' ')}
                    </td>
                    {mode === 'staff' && (
                      <td className="py-3 px-4 text-right space-x-2">
                        {o.status === 'confirmed' && (
                          <button
                            type="button"
                            onClick={() =>
                              void handleUpdateOrderStatus(
                                o,
                                o.fulfillment === 'delivery' ? 'dispatched' : 'ready_for_pickup'
                              )
                            }
                            className="text-xs font-semibold text-blue-700 hover:underline"
                          >
                            {o.fulfillment === 'delivery' ? 'Mark Dispatched' : 'Ready for Pickup'}
                          </button>
                        )}
                        {(o.status === 'ready_for_pickup' || o.status === 'dispatched') && (
                          <button
                            type="button"
                            onClick={() => void handleUpdateOrderStatus(o, 'completed')}
                            className="text-xs font-semibold text-emerald-700 hover:underline"
                          >
                            Mark Completed
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {subTab === 'inventory' && mode === 'staff' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowAddSku(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
            >
              <PackagePlus className="w-4 h-4" />
              Add New SKU
            </button>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                  <th className="py-3 px-4 font-semibold">SKU &amp; Product</th>
                  <th className="py-3 px-4 font-semibold text-right">Price</th>
                  <th className="py-3 px-4 font-semibold text-right">Shelf Stock</th>
                  <th className="py-3 px-4 font-semibold text-right">Reorder At</th>
                  <th className="py-3 px-4 font-semibold text-right">Quick Restock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {products.map((p) => {
                  const low = p.stock <= p.lowStockThreshold;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        <div className="text-xs font-mono text-slate-500">
                          {p.sku} · {p.brand} · {p.category}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs tabular-nums">
                        {formatInr(p.priceInr)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono text-xs font-semibold tabular-nums ${
                          low ? 'text-amber-700' : 'text-emerald-700'
                        }`}
                      >
                        {p.stock} {low ? '(Low)' : ''}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-500">
                        {p.lowStockThreshold}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => void handleRestock(p, 10)}
                          className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg"
                        >
                          +10 Units
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddSku && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
              <h3 className="font-display text-2xl font-bold text-slate-900">Add Gear Shop SKU</h3>
              <button type="button" onClick={() => setShowAddSku(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreateSku} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">SKU Code *</label>
                  <input
                    type="text"
                    required
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    placeholder="SHOE-NK-VP11"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newCat}
                    onChange={(e) => setNewCat(e.target.value as ProductCategory)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white"
                  >
                    {(['rackets', 'balls', 'shoes', 'accessories', 'apparel'] as const).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Brand *</label>
                  <input
                    type="text"
                    required
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Price (INR) *</label>
                  <input
                    type="number"
                    required
                    min={10}
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Stock</label>
                  <input
                    type="number"
                    min={0}
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Low-Stock Alert At</label>
                  <input
                    type="number"
                    min={1}
                    value={newThreshold}
                    onChange={(e) => setNewThreshold(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg mt-2"
              >
                Save to Shared Shelf
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
