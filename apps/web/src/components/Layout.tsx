import { useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import type { SessionState } from "@portal/contracts";

const groups = [
  ["Campus", [["Home", "/"], ["Campus map", "/map"], ["Campus services", "/services"], ["Staff directory", "/directory"]]],
  ["Support directory", [["Health & emergency", "/support/health-emergency"], ["Well-being support", "/support/wellbeing"], ["Community safety", "/support/community-safety"]]],
  ["Campus now", [["Updates", "/updates"], ["Events", "/events"]]],
  ["Contact", [["Feedback forms", "/feedback"]]]
] as const;

export function Layout({ children, session }: { children: ReactNode; session: SessionState | null }) {
  const [open, setOpen] = useState(false);
  return <div className="app-frame">
    {open && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <NavLink to="/" className="brand" onClick={() => setOpen(false)}>
        <span className="brand-mark">SCP</span><span>Student Campus Portal</span><small>Public Portfolio Edition</small>
      </NavLink>
      <nav>
        {groups.map(([label, links]) => <section className="nav-group" key={label}>
          <h2>{label}</h2>
          {links.map(([name, path]) => <NavLink key={path} to={path} onClick={() => setOpen(false)}>{name}</NavLink>)}
        </section>)}
        <section className="nav-group"><h2>Project</h2><NavLink to="/about" onClick={() => setOpen(false)}>About this demo</NavLink>{session?.writeMode === "local" && <NavLink to="/admin" onClick={() => setOpen(false)}>Admin workspace</NavLink>}</section>
      </nav>
      <p className="sidebar-note">Fictional data · no production connection</p>
    </aside>
    <main className="main">
      <header className="mobile-header"><button onClick={() => setOpen(true)} aria-label="Open navigation">Menu</button><span>Student Campus Portal</span></header>
      <div className="portfolio-banner">Student-developed portfolio/reference project — not an official institution service.</div>
      {children}
    </main>
  </div>;
}
