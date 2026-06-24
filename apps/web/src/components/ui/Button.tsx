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

/* V2.1：2px 圆角（器物边缘），hover 仅颜色/透明度变化 */
const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--yun-ink)] text-[var(--yun-paper)] border-none hover:bg-[var(--yun-ink-light)]',
  ghost:
    'bg-transparent text-[var(--yun-ink-muted)] border border-[var(--yun-earth-faded)] hover:text-[var(--yun-earth)] hover:border-[var(--yun-earth)]',
  text: 'bg-transparent text-[var(--yun-ink-muted)] border-none hover:text-[var(--yun-earth)]',
};

const sizeClasses: Record<string, string> = {
  sm: 'px-5 py-2 text-sm',
  md: 'px-8 py-3 text-base',
  lg: 'px-10 py-4 text-lg',
};

/* V2.1：border-radius 2px，禁止 translateY/shadow/scale */
const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-[var(--yun-radius)] font-serif font-normal tracking-[0.05em] transition-colors duration-[280ms] ease-[var(--yun-ease-gentle)] cursor-pointer no-underline whitespace-nowrap';

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
