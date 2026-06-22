import Link from 'next/link';
import { ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'ghost' | 'text';

interface ButtonBaseProps {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
}

type ButtonAsButton = ButtonBaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: never };

type ButtonAsLink = ButtonBaseProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

type ButtonProps = ButtonAsButton | ButtonAsLink;

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--yun-ink)] text-[var(--yun-paper)] border border-[var(--yun-ink)] hover:bg-[var(--yun-jade)] hover:border-[var(--yun-jade)]',
  ghost:
    'bg-transparent text-[var(--yun-ink)] border border-[var(--yun-ink)] hover:bg-[var(--yun-ink)] hover:text-[var(--yun-paper)]',
  text: 'bg-transparent text-[var(--yun-ink)] border border-transparent hover:text-[var(--yun-jade)]',
};

const sizeClasses: Record<string, string> = {
  sm: 'px-5 py-2 text-sm',
  md: 'px-8 py-3 text-base',
  lg: 'px-10 py-4 text-lg',
};

const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-full font-serif font-light tracking-[0.05em] transition-all duration-300 cursor-pointer no-underline whitespace-nowrap';

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  if ('href' in props && props.href) {
    const { href, ...rest } = props as ButtonAsLink;
    return (
      <Link href={href} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...(props as ButtonAsButton)}>
      {children}
    </button>
  );
}
