import type { InputHTMLAttributes } from "react";

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "name"> {
  id: string;
  name: string;
  label: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
}

/**
 * ESDI form field: label above (asterisk glued to the label for required
 * fields), transparent input with a bottom rule only, body-lg text.
 * Errors sit below the input as a red fill strip with black text.
 */
export function Field({ id, name, label, required, error, hint, className, ...props }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`flex flex-col ${className ?? ""}`}>
      <label htmlFor={id} className="type-body-lg mb-3">
        {label}
        {required ? <span aria-hidden="true">*</span> : null}
      </label>
      <input
        id={id}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="type-body-lg w-full border-0 border-b border-ink bg-transparent py-3 text-ink placeholder:text-muted aria-invalid:border-b-2"
        {...props}
      />
      {hint ? (
        <p id={hintId} className="type-caption mt-2">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="type-caption mt-2 self-start bg-red px-2 py-1 text-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}
