import { Badge } from '@/components/ui';
import type { MandiCompareResult } from '@/lib/api/market';

export function MandiCompareBadge({
  compare,
  onImage = false,
}: {
  compare: MandiCompareResult;
  onImage?: boolean;
}) {
  if (compare.verdict === 'unknown') return null;

  if (compare.verdict === 'below_mandi') {
    const pct = compare.diffPercent ?? 0;
    return (
      <Badge tone="good" onImage={onImage}>
        Below mandi {pct !== 0 ? `${Math.abs(pct)}%` : ''}
      </Badge>
    );
  }

  if (compare.verdict === 'above_mandi') {
    const pct = compare.diffPercent ?? 0;
    return (
      <Badge tone="warn" onImage={onImage}>
        Above mandi +{pct}%
      </Badge>
    );
  }

  return (
    <Badge tone="neutral" onImage={onImage}>
      Matches mandi
    </Badge>
  );
}
