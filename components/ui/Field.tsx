"use client";
import { forwardRef } from "react";
import type {
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
  ReactNode,
} from "react";
import Icon from "./Icon";
import { cn } from "@/lib/cn";

export function Field({
  label,
  hint,
  error,
  children,
  required,
  optional,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm font-semibold text-ink-100">
          {label} {required && <span className="text-flame">*</span>}
          {optional && (
            <span className="text-ink-400 text-xs font-normal mr-1">(אופציונלי)</span>
          )}
        </span>
        {hint && <span className="text-xs text-ink-400">{hint}</span>}
      </div>
      {children}
      {error && <p className="mt-1 text-xs text-bad">{error}</p>}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full h-11 px-3.5 rounded-lg bg-ink-900 border border-ink-700 text-ink-50 placeholder:text-ink-500 focus:border-flame focus:bg-ink-800 outline-none transition-colors",
          className,
        )}
        {...props}
      />
    );
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full px-3.5 py-3 rounded-lg bg-ink-900 border border-ink-700 text-ink-50 placeholder:text-ink-500 focus:border-flame focus:bg-ink-800 outline-none transition-colors resize-y min-h-[120px]",
        className,
      )}
      {...props}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }
>(function Select({ className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "w-full h-11 pr-3.5 pl-10 rounded-lg bg-ink-900 border border-ink-700 text-ink-50 focus:border-flame outline-none transition-colors appearance-none cursor-pointer",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-400">
        <Icon name="chevDown" size={16} />
      </div>
    </div>
  );
});
