import { CATEGORY_META } from '@/lib/categories';
import type { Category } from '@/lib/types';
import { cn } from '@/lib/utils';

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        CATEGORY_META[category].badgeClass,
      )}
    >
      {category}
    </span>
  );
}

export function CategoryIcon({ category, size = 'md' }: { category: Category; size?: 'sm' | 'md' }) {
  const { icon: Icon, iconClass } = CATEGORY_META[category];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-xl',
        size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
        iconClass,
      )}
      aria-hidden
    >
      <Icon className={size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'} />
    </span>
  );
}
