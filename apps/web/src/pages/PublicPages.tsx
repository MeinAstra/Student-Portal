import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { DirectoryEntryInput, EventInput, FeedbackFormInput, NoticeInput, PublicContent, RecordWithMeta, ResourceInput, SupportContactInput } from "@portal/contracts";
import { Empty, ExternalLink, Page } from "../components/Page.js";

type MapRecord = PublicContent["campusMap"];

export function HomePage({ content }: { content: PublicContent }) {
  const notice = content.notices[0];
  return <Page eyebrow="Campus overview" title="Everything students need, in one clear place." intro="A fictional portal demonstrating campus information, support directories, updates, and secure content administration.">
    <div className="home-grid"><section className="feature"><p className="eyebrow">Latest update</p>{notice ? <><h2>{notice.title}</h2><p>{notice.summary}</p><Link className="text-link" to="/updates">All updates →</Link></> : <Empty>No current updates are published.</Empty>}</section>
    <section><p className="eyebrow">Start here</p><div className="quick-links">{([["Campus map", "/map"], ["Health & emergency", "/support/health-emergency"], ["Well-being support", "/support/wellbeing"], ["Staff directory", "/directory"]] as const).map(([name, path]) => <Link key={path} to={path}>{name}<span>→</span></Link>)}</div></section></div>
    <div className="privacy-statement"><p className="eyebrow">A deliberately narrow data boundary</p><h2>This demo publishes directory information. It does not collect private reports or support case details.</h2></div>
  </Page>;
}

export function MapPage({ map }: { map: MapRecord }) {
  return <Page eyebrow="Campus" title="Campus map" intro="A configurable map area using fictional information only.">{!map ? <Empty>No map is configured.</Empty> : <article className="map-card"><div className="map-placeholder" aria-hidden="true"><span>Learning Hub</span><span>Commons</span><span>Welcome Desk</span></div><div><h2>{map.title}</h2><p>{map.description}</p>{map.imageUrl && <SafeImage key={map.imageUrl} src={map.imageUrl} alt={map.title} />}</div></article>}</Page>;
}

function SafeImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? <p className="image-unavailable" role="status">Configured image is currently unavailable.</p> : <img src={src} alt={alt} onError={() => setFailed(true)} />;
}

export function ResourcesPage({ resources }: { resources: Array<RecordWithMeta<ResourceInput>> }) {
  return <Page eyebrow="Campus" title="Campus services" intro="Practical, fictional directory entries that demonstrate replaceable institution-managed content."><CardList records={resources} render={(item) => <><p className="eyebrow">{item.category}</p><h2>{item.title}</h2><p>{item.description}</p>{item.url && <ExternalLink href={item.url}>Open resource</ExternalLink>}</>} /></Page>;
}

export function DirectoryPage({ entries }: { entries: Array<RecordWithMeta<DirectoryEntryInput>> }) {
  return <Page eyebrow="People" title="Staff directory" intro="All names, departments, addresses, and locations in this edition are fictional."><CardList records={entries} render={(item) => <><p className="eyebrow">{item.department}</p><h2>{item.name}</h2><p>{item.role}</p>{item.location && <p>{item.location}</p>}{item.email && <a className="text-link" href={`mailto:${item.email}`}>{item.email}</a>}</>} /></Page>;
}

const supportSections = {
  "health-emergency": ["health_emergency", "Health & emergency", "Fictional directory entries for institution-approved health and urgent-support contacts."],
  wellbeing: ["wellbeing", "Well-being support", "A fictional support-directory demonstration, without case records or clinical guidance."],
  "community-safety": ["community_safety", "Community safety", "Fictional contact metadata only. This page is not a reporting route."]
} as const;

export function SupportPage({ contacts }: { contacts: Array<RecordWithMeta<SupportContactInput>> }) {
  const { section = "" } = useParams();
  const details = supportSections[section as keyof typeof supportSections];
  if (!details) return <NavigateSupport />;
  const [key, title, intro] = details;
  const matching = contacts.filter((item) => item.section === key);
  return <Page eyebrow="Support directory" title={title} intro={intro}><div className="demo-caution"><strong>Portfolio demonstration:</strong> these entries are fictional and must not be used for real emergencies, counseling, or safety reporting.</div><CardList records={matching} render={(item) => <><h2>{item.title}</h2><p>{item.description}</p>{item.contactLabel && <p className="contact-label">{item.contactLabel}</p>}{item.url && <ExternalLink href={item.url}>Open approved resource</ExternalLink>}</>} /></Page>;
}

function NavigateSupport() { return <Page eyebrow="Support" title="Directory entry not found" intro="Choose a support section from the navigation."><Empty>No matching section exists.</Empty></Page>; }

export function UpdatesPage({ notices }: { notices: Array<RecordWithMeta<NoticeInput>> }) {
  return <Page eyebrow="Campus now" title="Updates" intro="Current notices are filtered by server-enforced visibility, publish date, and expiry date."><div className="editorial-list">{notices.length ? notices.map((item) => <article key={item.id}><div><time>{item.publishDate}</time><span>{item.category}</span></div><div><h2>{item.title}</h2><p>{item.summary}</p></div></article>) : <Empty>No current updates are published.</Empty>}</div></Page>;
}

export function EventsPage({ events }: { events: Array<RecordWithMeta<EventInput>> }) {
  return <Page eyebrow="Campus now" title="Coming up" intro="A concise calendar of fictional campus activities."><div className="editorial-list">{events.length ? events.map((item) => <article key={item.id}><div><time>{item.date}</time><span>{item.category}</span></div><div><h2>{item.title}</h2><p>{item.description}</p><p>{item.location}</p>{item.registrationUrl && <ExternalLink href={item.registrationUrl}>Registration information</ExternalLink>}</div></article>) : <Empty>No upcoming events are published.</Empty>}</div></Page>;
}

export function FeedbackPage({ forms }: { forms: Array<RecordWithMeta<FeedbackFormInput>> }) {
  return <Page eyebrow="Contact" title="Feedback forms" intro="The portal stores and displays only form names, approved HTTPS links, and visibility. Form responses remain outside this application."><div className="link-list">{forms.length ? forms.map((form) => <ExternalLink key={form.id} href={form.url}>{form.name}</ExternalLink>) : <Empty>No feedback forms are currently available.</Empty>}</div></Page>;
}

export function AboutPage() {
  return <Page eyebrow="Project" title="About this portfolio edition" intro="A student-developed reference implementation derived from a real school-portal design exercise."><div className="prose"><h2>Independent and fictional</h2><p>This is not an official school service, is not endorsed by an institution, and is not connected to production school infrastructure. It uses no real student, staff, or private data.</p><h2>Engineering focus</h2><p>The project demonstrates a React frontend, a modular Node API, PostgreSQL constraints and migrations, server-managed sessions, role-based authorization, validation, audit events, security headers, rate limiting, tests, and reproducible local setup.</p><h2>Trust boundary</h2><p>External forms remain external. The portal does not receive, store, proxy, or analyze form responses. Support pages contain only fictional directory metadata and never support cases, medical histories, or safety reports.</p></div></Page>;
}

function CardList<T extends { id: string }>({ records, render }: { records: T[]; render: (item: T) => React.ReactNode }) {
  return records.length ? <div className="card-grid">{records.map((item) => <article className="card" key={item.id}>{render(item)}</article>)}</div> : <Empty>No entries are currently available.</Empty>;
}
