import Link from 'next/link';
import Image from 'next/image';

interface ProductCardProps {
  slug: string;
  name: string;
  coverImage?: string | null;
  seriesName?: string | null;
  seriesSlug?: string | null;
  salePrice: number;
  objectCategory?: string | null;
  companionsCount?: number;
  className?: string;
}

export default function ProductCard({
  slug,
  name,
  coverImage,
  seriesName,
  seriesSlug,
  salePrice,
  objectCategory,
  companionsCount,
  className = '',
}: ProductCardProps) {
  return (
    <Link
      href={`/products/${slug}`}
      className={`yun-vessel group block ${className}`}
    >
      {/* 图片区 — Vessel 无圆角 */}
      <div className="relative aspect-[4/5] overflow-hidden" style={{ backgroundColor: 'var(--yun-paper-aged)' }}>
        {coverImage ? (
          <Image
            src={coverImage}
            alt={name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover"
            style={{ filter: 'saturate(0.85)' }}
            /* 禁止：scale transform on hover (Task 04) */
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-6xl text-[var(--yun-ink-faded)] select-none">
              {name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* 信息区 — Vessel 样式 */}
      <div className="space-y-2" style={{ padding: 'var(--yun-space-4) 0' }}>
        {seriesName && (
          <div className="flex items-center gap-2">
            <span className="text-xs tracking-[var(--yun-spacing-caption)] text-[var(--yun-earth)]">
              {seriesName}
            </span>
            {objectCategory && (
              <>
                <span className="text-[var(--yun-border-medium)]">·</span>
                <span className="text-xs tracking-[var(--yun-spacing-caption)] text-[var(--yun-ink-faded)]">
                  {objectCategory}
                </span>
              </>
            )}
          </div>
        )}

        <h3 className="yun-vessel-title text-base tracking-wider">
          {name}
        </h3>

        <p className="text-sm text-[var(--yun-ink-muted)] font-light">
          ¥{salePrice.toLocaleString()}
        </p>

        {/* 时间性 UI (Task 07) */}
        {companionsCount && companionsCount > 0 && (
          <div className="yun-temporal">
            <span className="yun-temporal-item">已陪伴 {companionsCount} 位同行者</span>
          </div>
        )}
      </div>
    </Link>
  );
}
