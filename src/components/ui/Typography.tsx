import type { ReactNode } from "react";

/** h1 page title: display-xxl, vw-locked, optical left shift (ESDI h0). */
export function PageTitle({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <h1 id={id} className={`type-display-xxl optical-left pb-6 ${className ?? ""}`}>
      {children}
    </h1>
  );
}

/** Section title. `xxl` = ESDI home titles; `lg` = inner-page sub-sections followed by a rule. */
export function SectionTitle({
  children,
  size = "xxl",
  id,
  className,
  as: Tag = "h2",
}: {
  children: ReactNode;
  size?: "xxl" | "lg";
  id?: string;
  className?: string;
  as?: "h2" | "h3";
}) {
  const cls = size === "xxl" ? "type-display-xxl optical-left pb-6" : "type-display-lg pb-6";
  return (
    <Tag id={id} className={`${cls} ${className ?? ""}`}>
      {children}
    </Tag>
  );
}

export function Lead({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={`type-lead ${className ?? ""}`}>{children}</p>;
}

export function VisuallyHidden({ children, as: Tag = "span" }: { children: ReactNode; as?: "span" | "h2" | "p" | "caption" }) {
  return <Tag className="sr-only">{children}</Tag>;
}
