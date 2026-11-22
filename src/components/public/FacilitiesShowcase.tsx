import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { CLUB_IMAGES } from '@/src/config/clubImages';
import type { SportType } from '@/src/types/club';

interface FacilitiesShowcaseProps {
  onSelectSport: (sport: SportType) => void;
}

export function FacilitiesShowcase({ onSelectSport }: FacilitiesShowcaseProps) {
  const facilities = [
    {
      title: 'Championship Tennis & Box Cricket Turf',
      kicker: 'Outdoor DecoTurf · FIFA-Grade AstroTurf & Practice Nets',
      image: CLUB_IMAGES.tennisCricket,
      description:
        'Two floodlit DecoTurf & synthetic clay tennis courts beside our 6-a-side box cricket turf arena and twin bowling practice nets.',
      actionLabel: 'Check Tennis & Cricket Slots',
      onAction: () => {
        onSelectSport('tennis');
        document.getElementById('courts')?.scrollIntoView({ behavior: 'smooth' });
      },
    },
    {
      title: 'Panoramic Padel & Maple-Wood Badminton',
      kicker: 'Mondo Supercourt Glass Padel · BWF Indoor Badminton Halls',
      image: CLUB_IMAGES.padelBadminton,
      description:
        'All-weather tempered-glass padel courts paired with air-cooled indoor maple-wood badminton courts built for high-speed doubles.',
      actionLabel: 'Check Padel & Badminton Slots',
      onAction: () => {
        onSelectSport('padel');
        document.getElementById('courts')?.scrollIntoView({ behavior: 'smooth' });
      },
    },
    {
      title: 'Pro Gear Shop & 10-Minute Express Restringing',
      kicker: 'Rackets · Court Shoes · Balls & Shuttles · Apparel',
      image: CLUB_IMAGES.gearShop,
      description:
        'Snapped a string 10 minutes before your match or ordering ASICS court shoes from home? Counter sales and online orders pull from the same live shelf.',
      actionLabel: 'Browse Live Gear Stock',
      onAction: () => {
        document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
      },
    },
    {
      title: 'Clubhouse Bar, Terrace Cafe & Member Tabs',
      kicker: 'Electrolytes · Cold Brew · High-Protein Plates · Craft Drafts',
      image: CLUB_IMAGES.barLounge,
      description:
        'Walk straight off court to a sunlit terrace bar. Members automatically receive 10%–15% off and can run an open tab until they head home.',
      actionLabel: 'Explore Membership Savings',
      onAction: () => {
        document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' });
      },
    },
  ];

  return (
    <section id="facilities" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 border-b border-slate-200">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10"
      >
        <div>
          <p className="text-xs font-semibold text-blue-700 mb-1.5">Inside Udaan Sports Club</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Four Sports, Boutique Pro Shop &amp; Terrace Clubhouse
          </h2>
        </div>
        <p className="text-sm text-slate-600 max-w-md">
          Designed for competitive match play from 6 am rallies to Friday evening Social Play and
          post-match dining.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {facilities.map((card, idx) => (
          <motion.article
            key={card.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.3, delay: idx * 0.06 }}
            whileHover={{ y: -6 }}
            className="group bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-200 hover:border-blue-300 hover:shadow-xl hover:shadow-slate-900/6"
          >
            <div>
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                <img
                  src={card.image}
                  alt={card.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <div className="p-5 sm:p-6">
                <p className="text-xs text-slate-500 mb-1.5">{card.kicker}</p>
                <h3 className="font-display text-2xl font-bold text-slate-900 group-hover:text-blue-700 transition-colors duration-200 mb-2">
                  {card.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">{card.description}</p>
              </div>
            </div>
            <div className="px-5 sm:px-6 pb-6">
              <button
                type="button"
                onClick={card.onAction}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 transition-colors"
              >
                {card.actionLabel}
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1.5" />
              </button>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
