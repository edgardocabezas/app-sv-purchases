"use client";

import type { ClassificationOption } from "@/lib/dte/classification-options";
import { cn } from "@/lib/utils";

export function ClassificationSelect({
  id,
  value,
  options,
  onChange,
  disabled,
  className,
  compact,
}: {
  id?: string;
  value: string;
  options: readonly ClassificationOption[];
  onChange: (code: string) => void;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}) {
  return (
    <select
      id={id}
      className={cn(
        "flex w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm",
        compact ? "h-8 min-w-[7rem] max-w-[12rem]" : "h-9",
        className,
      )}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((opt) => (
        <option key={opt.code} value={opt.code}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
