import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

interface FieldWrapperProps {
  label?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

function FieldWrapper({ label, error, hint, children }: FieldWrapperProps) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-sm font-medium text-ink-800">{label}</span>}
      {children}
      {hint && !error && <span className="text-xs text-ink-500">{hint}</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}

const baseFieldClasses =
  "w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 outline-none transition-shadow focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:bg-ink-50 disabled:text-ink-400";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className = "", ...rest }: InputProps) {
  return (
    <FieldWrapper label={label} error={error} hint={hint}>
      <input className={`${baseFieldClasses} ${error ? "border-red-400" : ""} ${className}`} {...rest} />
    </FieldWrapper>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({ label, error, hint, className = "", ...rest }: TextareaProps) {
  return (
    <FieldWrapper label={label} error={error} hint={hint}>
      <textarea className={`${baseFieldClasses} min-h-24 resize-y ${error ? "border-red-400" : ""} ${className}`} {...rest} />
    </FieldWrapper>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Select({ label, error, hint, className = "", children, ...rest }: SelectProps) {
  return (
    <FieldWrapper label={label} error={error} hint={hint}>
      <select className={`${baseFieldClasses} ${error ? "border-red-400" : ""} ${className}`} {...rest}>
        {children}
      </select>
    </FieldWrapper>
  );
}
