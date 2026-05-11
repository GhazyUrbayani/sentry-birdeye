import type { Grade } from '@/types';

const styles: Record<Grade, string> = {
  SAFE: 'bg-emerald-600/20 text-emerald-300 ring-emerald-600/30',
  CAUTION: 'bg-amber-600/20 text-amber-300 ring-amber-600/30',
  DEGEN: 'bg-fuchsia-600/20 text-fuchsia-300 ring-fuchsia-600/30',
  RUG: 'bg-rose-600/20 text-rose-300 ring-rose-600/30',
};

export function GradeBadge({ grade }: { grade: Grade }) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1',
        styles[grade],
      ].join(' ')}
    >
      {grade}
    </span>
  );
}

