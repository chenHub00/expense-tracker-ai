import { Car, Film, Package, Receipt, ShoppingBag, Utensils, type LucideIcon } from 'lucide-react';
import type { Category } from './types';

interface CategoryMeta {
  icon: LucideIcon;
  /** Hex colour used by charts. */
  color: string;
  /** Tailwind classes for the round icon container. */
  iconClass: string;
  /** Tailwind classes for the pill badge. */
  badgeClass: string;
}

// Full class strings are listed explicitly so Tailwind can detect them at build time.
export const CATEGORY_META: Record<Category, CategoryMeta> = {
  Food: {
    icon: Utensils,
    color: '#f97316',
    iconClass: 'bg-orange-100 text-orange-600',
    badgeClass: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  },
  Transportation: {
    icon: Car,
    color: '#3b82f6',
    iconClass: 'bg-blue-100 text-blue-600',
    badgeClass: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  },
  Entertainment: {
    icon: Film,
    color: '#a855f7',
    iconClass: 'bg-purple-100 text-purple-600',
    badgeClass: 'bg-purple-50 text-purple-700 ring-purple-600/20',
  },
  Shopping: {
    icon: ShoppingBag,
    color: '#ec4899',
    iconClass: 'bg-pink-100 text-pink-600',
    badgeClass: 'bg-pink-50 text-pink-700 ring-pink-600/20',
  },
  Bills: {
    icon: Receipt,
    color: '#10b981',
    iconClass: 'bg-emerald-100 text-emerald-600',
    badgeClass: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  },
  Other: {
    icon: Package,
    color: '#64748b',
    iconClass: 'bg-slate-100 text-slate-600',
    badgeClass: 'bg-slate-50 text-slate-700 ring-slate-600/20',
  },
};
