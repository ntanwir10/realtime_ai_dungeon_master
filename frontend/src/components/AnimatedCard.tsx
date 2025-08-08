import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AnimatedCardProps {
  children: ReactNode;
  title?: string;
  className?: string;
  delay?: number;
  onClick?: () => void;
  interactive?: boolean;
}

export function AnimatedCard({
  children,
  title,
  className,
  delay = 0,
  onClick,
  interactive = false,
}: AnimatedCardProps) {
  return (
    <Card
      className={cn(
        "transition-all duration-300 ease-in-out hover:shadow-lg",
        interactive && "cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
        className
      )}
      style={{
        animationDelay: `${delay}ms`,
        animation: "fadeInUp 0.6s ease-out forwards",
      }}
      onClick={onClick}
    >
      {title && (
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function FadeInContainer({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={cn("animate-fade-in", className)}
      style={{
        animationDelay: `${delay}ms`,
        animation: "fadeIn 0.5s ease-out forwards",
      }}
    >
      {children}
    </div>
  );
}
