import Link from 'next/link';

interface TagProps {
  children: React.ReactNode;
  href?: string;
  active?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export default function Tag({
  children,
  href,
  active = false,
  className = '',
  onClick,
}: TagProps) {
  /* V2.1：2px圆角，hover仅颜色/透明度 */
  const baseClasses =
    'inline-block px-4 py-1.5 text-xs tracking-[0.08em] rounded-[var(--yun-radius)] transition-colors duration-[280ms] ease-[var(--yun-ease-gentle)] cursor-pointer border';

  const activeClasses = active
    ? 'bg-[var(--yun-ink)] text-[var(--yun-paper)] border-[var(--yun-ink)]'
    : 'bg-transparent text-[var(--yun-ink-muted)] border-[var(--yun-border-medium)] hover:text-[var(--yun-earth)] hover:border-[var(--yun-earth)]';

  const classes = `${baseClasses} ${activeClasses} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} onClick={onClick}>
      {children}
    </button>
  );
}
