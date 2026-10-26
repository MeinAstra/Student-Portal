import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import type { PublicContent, SessionState } from "@portal/contracts";
import { api } from "./api.js";
import { Layout } from "./components/Layout.js";
import { AdminPage } from "./pages/AdminPage.js";
import { AboutPage, DirectoryPage, EventsPage, FeedbackPage, HomePage, MapPage, ResourcesPage, SupportPage, UpdatesPage } from "./pages/PublicPages.js";

export function App() {
  const [content, setContent] = useState<PublicContent | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const [error, setError] = useState("");
  const refresh = async () => setContent(await api.publicContent());

  useEffect(() => {
    Promise.all([api.publicContent(), api.session()])
      .then(([nextContent, nextSession]) => { setContent(nextContent); setSession(nextSession); })
      .catch((reason: Error) => setError(reason.message));
  }, []);
  useEffect(() => {
    const clearExpiredSession = () => setSession((current) => current ? { ...current, user: null, csrfToken: null } : current);
    window.addEventListener("portal:unauthorized", clearExpiredSession);
    return () => window.removeEventListener("portal:unauthorized", clearExpiredSession);
  }, []);

  if (error) return <main className="standalone-message"><h1>Portal unavailable</h1><p>{error}</p><p>Start the local API and database, then refresh.</p></main>;
  if (!content || !session) return <main className="standalone-message"><p>Loading demonstration content…</p></main>;

  return <Layout session={session}>
    {content.portalStatus?.message && <div className="status-banner" role="status">{content.portalStatus.message}</div>}
    <Routes>
      <Route path="/" element={<HomePage content={content} />} />
      <Route path="/map" element={<MapPage map={content.campusMap} />} />
      <Route path="/services" element={<ResourcesPage resources={content.resources} />} />
      <Route path="/directory" element={<DirectoryPage entries={content.directory} />} />
      <Route path="/support/:section" element={<SupportPage contacts={content.support} />} />
      <Route path="/updates" element={<UpdatesPage notices={content.notices} />} />
      <Route path="/events" element={<EventsPage events={content.events} />} />
      <Route path="/feedback" element={<FeedbackPage forms={content.feedbackForms} />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/admin" element={<AdminPage session={session} setSession={setSession} refreshPublic={refresh} content={content} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Layout>;
}
