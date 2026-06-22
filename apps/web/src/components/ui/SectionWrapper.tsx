interface SectionWrapperProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  dark?: boolean;
  narrow?: boolean;
}

export default function SectionWrapper({
  children,
  className = '',
  id,
  dark = false,
  narrow = false,
}: SectionWrapperProps) {
  return (
    <section
      id={id}
      className={`
        ${dark ? 'bg-[var(--yun-ink)] text-[var(--yun-paper)]' : 'bg-[var(--yun-paper)]'}
        ${className}
      `}
    >
      <div
        className={`
          mx-auto px-[var(--yun-section-px)]
          ${narrow ? 'max-w-3xl' : 'max-w-[1200px]'}
          py-[var(--yun-section-py-mobile)] md:py-[var(--yun-section-py)]
        `}
      >
        {children}
      </div>
    </section>
  );
}
