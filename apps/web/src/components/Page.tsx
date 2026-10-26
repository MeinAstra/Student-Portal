import type { ReactNode } from "react";

export function Page({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: ReactNode }) {
  return <div className="page-shell"><header className="page-header"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{intro}</p></header>{children}</div>;
}

export function Empty({ children }: { children: ReactNode }) { return <p className="empty">{children}</p>; }

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return <a className="text-link" href={href} target="_blank" rel="noopener noreferrer">{children} <span aria-hidden="true">↗</span></a>;
}
