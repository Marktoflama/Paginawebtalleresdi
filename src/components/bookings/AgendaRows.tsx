import type { ReactNode } from "react";

export interface AgendaRow {
  key: string;
  date: ReactNode;
  /** Small line above the title (ESDI "Evento / Masterclass"). */
  category: ReactNode;
  title: ReactNode;
  action?: ReactNode;
  muted?: boolean;
}

/**
 * ESDI agenda table: 25% date · auto (category + UPPERCASE title) · 25% action.
 * Rows stack below 768 (date large, category top-right). Explicit table roles
 * keep the semantics when the cells switch to display:block on mobile.
 */
export function AgendaRows({ caption, headers, rows }: { caption: string; headers: [string, string, string]; rows: AgendaRow[] }) {
  return (
    <table role="table" className="w-full rule-top">
      <caption className="sr-only">{caption}</caption>
      <thead role="rowgroup" className="sr-only">
        <tr role="row">
          <th role="columnheader" scope="col">
            {headers[0]}
          </th>
          <th role="columnheader" scope="col">
            {headers[1]}
          </th>
          <th role="columnheader" scope="col">
            {headers[2]}
          </th>
        </tr>
      </thead>
      <tbody role="rowgroup">
        {rows.map((row) => (
          <tr role="row" key={row.key} className={`block rule-bottom last:border-b-0 md:table-row ${row.muted ? "text-muted" : ""}`}>
            <td role="cell" className="type-agenda-date relative block pt-3.5 align-top md:table-cell md:w-1/4 md:pb-5">
              {row.date}
              <span aria-hidden="true" className="type-caption absolute top-4 right-0 md:hidden">
                {row.category}
              </span>
            </td>
            <td role="cell" className="block pt-3.5 align-top md:table-cell md:pt-4 md:pb-5">
              <span className="type-caption block pb-1.5 max-md:sr-only">{row.category}</span>
              <span className="type-agenda-title tabular uppercase">{row.title}</span>
            </td>
            <td role="cell" className="block pt-3.5 pb-4 align-middle md:table-cell md:w-1/4 md:py-0">
              {row.action}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
