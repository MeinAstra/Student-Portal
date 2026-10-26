import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { Page } from "../components/Page.js";
import { originalPages } from "./content.js";

const navigation = [
  ["Explore", [["Home", "/"], ["Health & emergency", "/health"], ["Psychology & well-being", "/wellbeing"], ["Community safety", "/safety"], ["Daily life help", "/daily-life"]]],
  ["Project concepts", [["Campus map", "/map"], ["Contact & feedback", "/feedback"], ["About the project", "/about"]]]
] as const;

export function StaticApp() {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const location = useLocation();
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const focusable = [...(sidebar.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [])];
    focusable[0]?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); menuButton.current?.focus(); }
      else if (event.key === "Tab" && focusable.length > 0) {
        const first = focusable[0]!;
        const last = focusable.at(-1)!;
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);
  const closeNavigation = () => { setOpen(false); menuButton.current?.focus(); };
  const followLink = () => { if (open) { setOpen(false); document.getElementById("static-main")?.focus(); } };
  return <div className="app-frame static-edition">
    <a className="skip-link" href="#static-main">Skip to main content</a>
    {open && <button className="nav-scrim" aria-label="Close navigation" onClick={closeNavigation} />}
    <aside ref={sidebar} id="static-navigation" className={"sidebar " + (open ? "sidebar-open" : "")}>
      <NavLink to="/" className="brand" onClick={followLink}><span className="brand-mark">SCP</span><span>Student Campus Portal</span><small>Independent Student Project</small></NavLink>
      <nav aria-label="Main navigation">{navigation.map(([group, links]) => <section className="nav-group" key={group}><h2>{group}</h2>{links.map(([label, path]) => <NavLink key={path} to={path} onClick={followLink}>{label}</NavLink>)}</section>)}</nav>
      <p className="sidebar-note">Original concepts · read-only portfolio</p>
    </aside>
    <main id="static-main" className="main" tabIndex={-1}>
      <header className="mobile-header"><button ref={menuButton} type="button" aria-expanded={open} aria-controls="static-navigation" onClick={() => open ? closeNavigation() : setOpen(true)}>{open ? "Close" : "Menu"}</button><span>Student Campus Portal</span></header>
      <div className="portfolio-banner">Independent student project · historical design concepts · not an official school service</div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/:id" element={<OriginalContent />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  </div>;
}

function Home() {
  return <Page eyebrow="Independent student project" title="Student Campus Portal" intro="Explore the original portal concepts and selected wording from an earlier student project, presented as a read-only portfolio edition.">
    <div className="home-grid"><section className="feature"><p className="eyebrow">The idea</p><h2>Information, support, and community life in one place.</h2><p>This edition restores selected original writing and navigation ideas without connecting to a real school, collecting information, or offering a live service.</p></section><section><p className="eyebrow">Explore the original topics</p><div className="quick-links">{originalPages.map((page) => <Link key={page.id} to={"/" + page.id}>{page.title}<span aria-hidden="true">→</span></Link>)}</div></section></div>
    <div className="privacy-statement"><p className="eyebrow">Publication boundary</p><h2>Fictional presentation. No account, report form, database, or active support route.</h2></div>
  </Page>;
}

function OriginalContent() {
  const { id } = useParams();
  const page = originalPages.find((item) => item.id === id);
  if (page) return <Page eyebrow="Recovered project writing" title={page.title} intro="Selected verbatim passages from the earliest available portal draft. Editorial context appears outside the original text.">
    <div className="original-context">Historical project writing, presented for discussion and review. This static portfolio does not provide a school service, emergency response, counseling, or reporting.</div>
    <div className="original-text">{page.sections.map((section, index) => <section key={index} className="original-section">{section.heading && <h2>{section.heading}</h2>}{section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{section.items && <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>}</section>)}</div>
  </Page>;
  if (id === "map") return <Page eyebrow="Original navigation concept" title="Campus Map" intro="A read-only, fictional layout sketch—not a map of an actual campus."><div className="map-card"><div className="map-placeholder" aria-label="Fictional layout sketch"><span>Library</span><span>Commons</span><span>Welcome area</span><span>Learning space</span></div><div className="prose"><h2>Campus information</h2><p>The original design included a campus-map destination. Its map upload and location records were not suitable for an independent static public edition.</p></div></div></Page>;
  if (id === "feedback") return <Page eyebrow="Original product concept" title="Contact & Feedback" intro="A read-only account of the original feedback idea."><div className="prose"><h2>Feedback as a design idea</h2><p>The earlier prototype explored ways for students to raise concerns and suggest improvements. This public edition has no submission form, tracking, analytics, or connection to a school system.</p></div></Page>;
  if (id === "about") return <Page eyebrow="Project history" title="About this edition" intro="A student-origin portal concept presented alongside an independent full-stack engineering prototype."><div className="prose"><h2>What this website contains</h2><p>Selected wording from an earlier exported portal draft is reproduced without editorial rewriting. New navigation and explanatory text are presentation material, not claimed as original writing.</p><h2>Engineering record</h2><p>The repository also includes a separate React, Express, and PostgreSQL implementation for local engineering review. GitHub Pages serves only this read-only React build; it does not run the API or database.</p><h2>Authorship and limitations</h2><p>The recovered files show the historical text and design, but they do not prove the authorship of every sentence. See PROVENANCE.md and the private publication feedback for source and editorial boundaries.</p></div></Page>;
  return <Navigate to="/" replace />;
}
