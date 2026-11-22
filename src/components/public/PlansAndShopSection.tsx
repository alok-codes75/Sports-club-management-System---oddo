import { motion } from 'motion/react';
import { ArrowRight, ShoppingBag, Users } from 'lucide-react';
import {
  TIER_ENTITLEMENTS,
  type MembershipTier,
  type Product,
  type SocialSession,
} from '@/src/types/club';
import { formatInr } from '@/src/utils/clubHelpers';

interface PlansAndShopSectionProps {
  products: Product[];
  socialSessions: SocialSession[];
  onSelectPlanForEnquiry: (tier: MembershipTier) => void;
  onOpenMemberLogin: () => void;
  onOpenMemberSignUp: () => void;
  onRequestTrialSpot: () => void;
}

export function PlansAndShopSection({
  products,
  socialSessions,
  onSelectPlanForEnquiry,
  onOpenMemberLogin,
  onOpenMemberSignUp,
  onRequestTrialSpot,
}: PlansAndShopSectionProps) {
  return (
    <>
      <section id="plans" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 border-b border-slate-200">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.3 }}
          className="mb-10"
        >
          <p className="text-xs font-semibold text-blue-700 mb-1.5">Membership Tiers</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Transparent INR Plans With Automatic Club Discounts
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Every membership automatically applies your court rate, gear shop discount, and bar
            savings the moment staff recognize your profile or you sign into your Member Portal.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {(['gold', 'silver', 'junior'] as MembershipTier[]).map((tierKey, idx) => {
            const plan = TIER_ENTITLEMENTS[tierKey];
            const isGold = tierKey === 'gold';
            return (
              <motion.div
                key={tierKey}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.3, delay: idx * 0.06 }}
                whileHover={{ y: -6 }}
                className={`rounded-2xl p-6 flex flex-col justify-between border transition-all duration-200 ${
                  isGold
                    ? 'border-blue-700 bg-gradient-to-b from-blue-50/80 to-white shadow-sm hover:shadow-xl hover:shadow-blue-700/12'
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-xl hover:shadow-slate-900/6'
                }`}
              >
                <div>
                  <div className="flex items-baseline justify-between gap-4 mb-2">
                    <h3 className="font-display text-3xl font-bold text-slate-900">{plan.name}</h3>
                    <span className="text-xs font-semibold text-blue-700">
                      {isGold ? 'Full Access' : tierKey === 'silver' ? 'Standard' : 'Under 18'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-6">{plan.tagline}</p>

                  <div className="pb-6 mb-6 border-b border-slate-200">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono text-3xl font-semibold tabular-nums text-slate-900">
                        {formatInr(plan.monthlyPriceInr)}
                      </span>
                      <span className="text-sm text-slate-500">/ month</span>
                    </div>
                    <p className="text-xs font-mono text-slate-500 mt-1 tabular-nums">
                      or {formatInr(plan.annualPriceInr)} billed annually
                    </p>
                  </div>

                  <dl className="space-y-3 text-sm mb-8">
                    <div className="flex items-center justify-between">
                      <dt className="text-slate-600">Court Booking Rate</dt>
                      <dd className="font-mono font-semibold text-slate-900">
                        {plan.courtDiscountPercent === 100
                          ? '₹0 (Included)'
                          : `${plan.courtDiscountPercent}% off walk-in`}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-slate-600">Daily Play Limit</dt>
                      <dd className="font-mono font-semibold text-slate-900">
                        {plan.maxSessionsPerDay} sessions / day
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-slate-600">Gear Shop Discount</dt>
                      <dd className="font-mono font-semibold text-slate-900">
                        {plan.shopDiscountPercent}% automatic
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-slate-600">Bar &amp; Cafeteria Discount</dt>
                      <dd className="font-mono font-semibold text-slate-900">
                        {plan.barDiscountPercent}% automatic
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-slate-600">Friday Social Play</dt>
                      <dd className="font-mono font-semibold text-slate-900">
                        {plan.socialPlayFeeInr === 0 ? 'Included' : formatInr(plan.socialPlayFeeInr)}
                      </dd>
                    </div>
                    <div className="pt-2 text-xs text-slate-500">{plan.eligibility}</div>
                  </dl>
                </div>

                <div className="space-y-2">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    onClick={onOpenMemberSignUp}
                    className={`w-full py-2.5 px-4 text-sm font-semibold rounded-lg transition-all duration-200 ${
                      isGold
                        ? 'bg-blue-700 text-white hover:bg-blue-800 hover:shadow-md hover:shadow-blue-700/20'
                        : 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md'
                    }`}
                  >
                    Sign Up &amp; Join {plan.name}
                  </motion.button>
                  <button
                    type="button"
                    onClick={() => onSelectPlanForEnquiry(tierKey)}
                    className="w-full py-2 px-4 text-xs font-semibold text-blue-700 hover:text-blue-800 hover:underline transition-colors"
                  >
                    Or request a custom quote from Front Desk →
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section id="shop" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 border-b border-slate-200">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6"
            >
              <div>
                <p className="text-xs font-semibold text-blue-700 mb-1">
                  Pro Gear Shop · Shared Live Shelf
                </p>
                <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
                  Rackets, Shoes, Balls &amp; Match-Day Restringing
                </h2>
              </div>
              <button
                type="button"
                onClick={onOpenMemberLogin}
                className="group inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 transition-colors whitespace-nowrap self-start sm:self-auto"
              >
                <ShoppingBag className="w-4 h-4 transition-transform duration-200 group-hover:-translate-y-0.5" />
                Order Online in Member Portal
              </button>
            </motion.div>

            {products.length === 0 ? (
              <div className="border border-slate-200 rounded-xl p-8 text-sm text-slate-500 bg-slate-50">
                Gear shop inventory streams live here once initialized from the Admin Console.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {products.slice(0, 6).map((item, idx) => {
                  const lowStock = item.stock > 0 && item.stock <= item.lowStockThreshold;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.26, delay: idx * 0.04 }}
                      whileHover={{ y: -4 }}
                      className="group border border-slate-200 rounded-xl p-5 bg-white flex flex-col justify-between hover:border-blue-400 hover:shadow-md hover:shadow-slate-900/5 transition-all duration-200"
                    >
                      <div>
                        <div className="text-xs text-slate-500 mb-1">
                          {item.brand} · {item.category} · <span className="font-mono">{item.sku}</span>
                        </div>
                        <h3 className="text-base font-semibold text-slate-900 group-hover:text-blue-700 transition-colors duration-200 mb-1">
                          {item.name}
                        </h3>
                        {item.description && (
                          <p className="text-xs text-slate-600 leading-relaxed mb-4">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <span className="font-mono font-semibold text-base tabular-nums text-slate-900">
                          {formatInr(item.priceInr)}
                        </span>
                        <span
                          className={`text-xs font-medium ${
                            item.stock === 0
                              ? 'text-red-600'
                              : lowStock
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {item.stock === 0
                            ? 'Out of stock'
                            : lowStock
                            ? `Low stock · ${item.stock} left`
                            : `In stock · ${item.stock} units`}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          <motion.div
            id="social"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.32 }}
            whileHover={{ y: -4 }}
            className="lg:col-span-4"
          >
            <div className="border border-slate-800 hover:border-blue-500/60 rounded-2xl p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white h-full flex flex-col justify-between shadow-sm hover:shadow-xl hover:shadow-blue-950/25 transition-all duration-300">
              <div>
                <p className="text-xs font-semibold text-lime-400 mb-2">Weekly Community Event</p>
                <h2 className="font-display text-3xl font-bold tracking-tight mb-3">
                  Friday Night Social Play
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed mb-6">
                  Courts open for shared-court mixed doubles and group rallies every Friday evening,
                  followed by post-match drinks and snacks at the clubhouse bar.
                </p>

                {socialSessions.length > 0 ? (
                  <div className="space-y-4">
                    {socialSessions.slice(0, 2).map((session) => (
                      <div
                        key={session.id}
                        className="border border-white/15 hover:border-lime-400/50 hover:bg-white/10 rounded-xl p-4 bg-white/5 transition-all duration-200"
                      >
                        <div className="text-xs text-lime-300 font-mono mb-1">
                          {session.date} · {session.startTime}–{session.endTime}
                        </div>
                        <div className="font-semibold text-white text-sm mb-2">{session.title}</div>
                        <div className="flex items-center justify-between text-xs text-slate-300">
                          <span className="inline-flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-lime-400" />
                            <span className="font-mono tabular-nums">
                              {session.spotsFilled}/{session.maxPlayers} joined
                            </span>
                          </span>
                          <span className="font-mono font-semibold text-white">
                            {formatInr(session.feeInr)} guest · ₹0 Gold
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border border-white/15 rounded-xl p-4 text-xs text-slate-300">
                    Upcoming Friday Social Play schedule publishes live once initialized.
                  </div>
                )}
              </div>

              <div className="mt-8 pt-5 border-t border-white/15 space-y-2.5">
                <motion.button
                  type="button"
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onOpenMemberLogin}
                  className="group w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-950 bg-lime-400 hover:bg-lime-300 rounded-lg transition-all duration-200"
                >
                  Join in Member Portal
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                </motion.button>
                <a
                  href="#enquire"
                  onClick={onRequestTrialSpot}
                  className="w-full inline-flex items-center justify-center text-xs font-medium text-slate-300 hover:text-white py-1 transition-colors"
                >
                  First-time visitor? Request a guest trial spot
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
