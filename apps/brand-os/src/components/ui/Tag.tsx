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
  const baseClasses =
    'inline-block px-4 py-1.5 text-xs tracking-[0.08em] rounded-full transition-all duration-300 cursor-pointer border';

  const activeClasses = active
    ? 'bg-[var(--yun-ink)] text-[var(--yun-paper)] border-[var(--yun-ink)]'
    : 'bg-transparent text-[var(--yun-gray)] border-[var(--yun-border)] hover:bg-[var(--yun-ink)] hover:text-[var(--yun-paper)] hover:border-[var(--yun-ink)]';

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
