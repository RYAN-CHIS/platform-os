import Link from 'next/link';
import Image from 'next/image';

interface ContentCardProps {
  slug: string;
  title: string;
  excerpt?: string | null;
  coverImage?: string | null;
  category?: string | null;
  categoryLabel?: string | null;
  publishedAt?: string | Date | null;
  className?: string;
}

export default function ContentCard({
  slug,
  title,
  excerpt,
  coverImage,
  category,
  categoryLabel,
  publishedAt,
  className = '',
}: ContentCardProps) {
  const dateStr = publishedAt
    ? new Date(publishedAt).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <Link
      href={`/journal/${slug}`}
      className={`yun-vessel group block ${className}`}
    >
      {/* 封面图 — Vessel 无圆角 */}
      {coverImage && (
        <div className="relative aspect-[16/10] overflow-hidden">
          <Image
            src={coverImage}
            alt={title}
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-cover"
            style={{ filter: 'saturate(0.85)' }}
            /* 禁止：scale transform on hover */
          />
        </div>
      )}

      {/* 信息区 — Vessel 样式 */}
      <div className="space-y-3" style={{ padding: 'var(--yun-space-6) 0' }}>
        <div className="flex items-center gap-3">
          {categoryLabel && (
            <span className="inline-block px-3 py-0.5 text-xs tracking-[var(--yun-spacing-caption)] text-[var(--yun-earth)]" style={{ border: '1px solid var(--yun-border-medium)', borderRadius: 'var(--yun-radius)' }}>
              {categoryLabel}
            </span>
          )}
          {dateStr && (
            <span className="text-xs text-[var(--yun-ink-faded)] tracking-[0.05em]">
              {dateStr}
            </span>
          )}
        </div>

        <h3 className="yun-vessel-title text-lg tracking-wider leading-snug">
          {title}
        </h3>

        {excerpt && (
          <p className="text-sm text-[var(--yun-ink-muted)] leading-relaxed line-clamp-2">
            {excerpt}
          </p>
        )}

        <span className="inline-block text-xs tracking-[var(--yun-spacing-caption)] text-[var(--yun-ink-faded)] group-hover:text-[var(--yun-earth)] transition-colors">
          阅读全文 →
        </span>
      </div>
    </Link>
  );
}
