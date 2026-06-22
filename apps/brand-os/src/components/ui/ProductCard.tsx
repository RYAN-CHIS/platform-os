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
  className = '',
}: ProductCardProps) {
  return (
    <Link
      href={`/products/${slug}`}
      className={`group block rounded-[var(--yun-radius)] overflow-hidden bg-[var(--yun-paper)] border border-[var(--yun-border)]/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--yun-shadow-hover)] ${className}`}
    >
      {/* 图片区 */}
      <div className="relative aspect-[3/4] overflow-hidden bg-[var(--yun-hover)]">
        {coverImage ? (
          <Image
            src={coverImage}
            alt={name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-6xl text-[var(--yun-gray)]/20 select-none">
              {name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* 信息区 */}
      <div className="p-5 space-y-2">
        {seriesName && (
          <div className="flex items-center gap-2">
            <span className="text-xs tracking-[0.1em] text-[var(--yun-gray)]">
              {seriesName}
            </span>
            {objectCategory && (
              <>
                <span className="text-[var(--yun-border)]">·</span>
                <span className="text-xs tracking-[0.1em] text-[var(--yun-gray)]">
                  {objectCategory}
                </span>
              </>
            )}
          </div>
        )}

        <h3 className="text-base font-serif font-light tracking-[0.08em] text-[var(--yun-ink)] group-hover:text-[var(--yun-jade)] transition-colors">
          {name}
        </h3>

        <p className="text-sm text-[var(--yun-gray)] font-sans">
          ¥{salePrice.toLocaleString()}
        </p>
      </div>
    </Link>
  );
}
