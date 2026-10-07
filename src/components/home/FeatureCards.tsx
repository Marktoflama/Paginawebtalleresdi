import Link from "next/link";

interface Feature {
  title: string;
  body: string;
  href: string;
}

/** Accent cycle by position, as on esdi.es (green, red, blue, yellow). Instant swap (M2). */
const HOVER = [
  "hover:bg-green focus-visible:bg-green",
  "hover:bg-red focus-visible:bg-red",
  "hover:bg-blue focus-visible:bg-blue",
  "hover:bg-yellow focus-visible:bg-yellow",
] as const;

/**
 * ESDI "Oferta académica" grid: 4 columns from 1024 (2 below), zero gap with
 * collapsed 1px borders, #e2e4e7 resting fill, title top-left, description
 * pinned to the bottom (hidden below 768). The whole block is the link.
 */
export function FeatureCards({ items }: { items: Feature[] }) {
  return (
    <ul className="mt-3 grid grid-cols-2 lg:grid-cols-4">
      {items.map((item, i) => (
        <li
          key={item.title}
          className="flex border-r border-b border-ink odd:border-l [&:nth-child(-n+2)]:border-t lg:border-t lg:odd:border-l-0 lg:first:border-l"
        >
          <Link
            href={item.href}
            className={`flex aspect-[199/220] w-full flex-col bg-surface p-(--card-pad) outline-offset-[-4px] md:aspect-auto md:min-h-[245px] xl:aspect-[466/499] ${HOVER[i % HOVER.length]}`}
          >
            <h3 className="type-display-lg">{item.title}</h3>
            {/* Spacing lives on the wrapper: sr-only/not-sr-only reset margins and would cancel mt-auto. */}
            <div className="mt-auto pt-6">
              <p className="type-body-copy sr-only md:not-sr-only">{item.body}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
