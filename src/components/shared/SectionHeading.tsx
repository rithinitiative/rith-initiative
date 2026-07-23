interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  centered?: boolean;
  className?: string;
}

export function SectionHeading({ 
  title, 
  subtitle, 
  centered = false,
  className = ""
}: SectionHeadingProps) {
  return (
    <div className={`section-heading ${centered ? "text-center" : ""} ${className}`}>
      <h2 className="font-heading text-2xl md:text-3xl lg:text-4xl font-semibold text-foreground mb-2 md:mb-4">
        {title}
      </h2>
      {subtitle && (
        <p className={`text-base text-muted-foreground italic max-w-2xl ${centered ? "mx-auto" : ""}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
