interface SectionContainerProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function SectionContainer({
  title,
  subtitle,
  children,
  action,
  className = "",
}: SectionContainerProps) {
  return (
    <section className={`mb-8 ${className}`}>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
