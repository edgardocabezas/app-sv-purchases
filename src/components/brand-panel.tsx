import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function BrandPanel({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("brand-panel", className)}>
      <div className="brand-panel-header">
        <div className="min-w-0 space-y-1">
          {eyebrow ? <p className="page-eyebrow">{eyebrow}</p> : null}
          <h2 className="font-heading text-lg font-semibold tracking-tight text-brand-ink">
            {title}
          </h2>
          {description ? (
            <div className="max-w-3xl text-sm leading-relaxed text-brand-muted">
              {description}
            </div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
        ) : null}
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}
