type LogoSize = "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<LogoSize, string> = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-4xl",
  xl: "text-6xl",
};

interface LogoProps {
  size?: LogoSize;
  className?: string;
}

export const Logo = ({ size = "md", className }: LogoProps) => {
  return (
    <h3
      className={`font-logo tracking-tight ${sizeClasses[size]} ${className ?? ""}`}
    >
      <span className="text-primary">STENO </span>
      <span className="text-foreground">DEXTER</span>
    </h3>
  );
};
