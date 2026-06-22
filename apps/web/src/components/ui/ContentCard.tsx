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
      className={`group block rounded-[var(--yun-radius)] overflow-hidden bg-[var(--yun-paper)] border border-[var(--yun-border)]/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--yun-shadow-hover)] ${className}`}
    >
      {/* 封面图 */}
      {coverImage && (
        <div className="relative aspect-[16/10] overflow-hidden">
          <Image
            src={coverImage}
            alt={title}
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </div>
      )}

      {/* 信息区 */}
      <div className="p-6 space-y-3">
        <div className="flex items-center gap-3">
          {categoryLabel && (
            <span className="inline-block px-3 py-0.5 text-xs tracking-[0.1em] text-[var(--yun-jade)] bg-[var(--yun-jade)]/5 rounded-full">
              {categoryLabel}
            </span>
          )}
          {dateStr && (
            <span className="text-xs text-[var(--yun-gray)] tracking-[0.05em]">
              {dateStr}
            </span>
          )}
        </div>

        <h3 className="text-lg font-serif font-light tracking-[0.06em] text-[var(--yun-ink)] leading-snug group-hover:text-[var(--yun-jade)] transition-colors">
          {title}
        </h3>

        {excerpt && (
          <p className="text-sm text-[var(--yun-gray)] leading-relaxed line-clamp-2">
            {excerpt}
          </p>
        )}

        <span className="inline-block text-xs tracking-[0.1em] text-[var(--yun-ink)]/50 group-hover:text-[var(--yun-jade)] transition-colors">
          阅读全文 →
        </span>
      </div>
    </Link>
  );
}
