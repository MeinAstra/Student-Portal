CREATE TABLE IF NOT EXISTS schema_migrations (
  name text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE portal_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE CHECK (email = lower(email) AND char_length(email) BETWEEN 3 AND 254),
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 120),
  password_hash text NOT NULL CHECK (char_length(password_hash) BETWEEN 32 AND 512),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_roles (
  user_id uuid NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('viewer', 'content_admin')),
  PRIMARY KEY (user_id, role)
);

CREATE TABLE sessions (
  id_hash text PRIMARY KEY CHECK (id_hash ~ '^[0-9a-f]{64}$'),
  user_id uuid NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  csrf_hash text NOT NULL CHECK (csrf_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);
CREATE INDEX sessions_expiry_idx ON sessions(expires_at);

CREATE TABLE notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  summary text NOT NULL CHECK (char_length(summary) BETWEEN 1 AND 2000),
  category text NOT NULL CHECK (char_length(category) BETWEEN 1 AND 160),
  publish_date date NOT NULL,
  expiry_date date,
  image_url text NOT NULL DEFAULT '' CHECK (image_url = '' OR image_url LIKE 'https://%'),
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expiry_date IS NULL OR expiry_date >= publish_date)
);

CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 2000),
  event_date date NOT NULL,
  location text NOT NULL CHECK (char_length(location) BETWEEN 1 AND 160),
  category text NOT NULL CHECK (char_length(category) BETWEEN 1 AND 160),
  registration_url text NOT NULL DEFAULT '' CHECK (registration_url = '' OR registration_url LIKE 'https://%'),
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE directory_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  role text NOT NULL CHECK (char_length(role) BETWEEN 1 AND 160),
  department text NOT NULL CHECK (char_length(department) BETWEEN 1 AND 160),
  email text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '' CHECK (char_length(location) <= 300),
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 2000),
  category text NOT NULL CHECK (char_length(category) BETWEEN 1 AND 160),
  url text NOT NULL DEFAULT '' CHECK (url = '' OR url LIKE 'https://%'),
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE support_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL CHECK (section IN ('health_emergency', 'wellbeing', 'community_safety')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 2000),
  contact_label text NOT NULL DEFAULT '' CHECK (char_length(contact_label) <= 300),
  url text NOT NULL DEFAULT '' CHECK (url = '' OR url LIKE 'https://%'),
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE feedback_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  url text NOT NULL CHECK (url LIKE 'https://%'),
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE asset_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  url text NOT NULL CHECK (url LIKE 'https://%'),
  alt_text text NOT NULL CHECK (char_length(alt_text) BETWEEN 1 AND 160),
  media_type text NOT NULL CHECK (media_type IN ('image', 'document')),
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE campus_map (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 2000),
  image_url text NOT NULL DEFAULT '' CHECK (image_url = '' OR image_url LIKE 'https://%'),
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE portal_status (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  message text NOT NULL DEFAULT '' CHECK (char_length(message) <= 300),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id uuid REFERENCES portal_users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  entity_type text NOT NULL CHECK (entity_type IN ('notices', 'events', 'directory', 'resources', 'support', 'feedbackForms', 'assets', 'campusMap', 'portalStatus')),
  entity_id text NOT NULL CHECK (char_length(entity_id) BETWEEN 1 AND 160),
  request_id uuid NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_events_occurred_idx ON audit_events(occurred_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['portal_users','notices','events','directory_entries','resources','support_contacts','feedback_forms','asset_metadata','campus_map','portal_status']
  LOOP
    EXECUTE format('CREATE TRIGGER set_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', table_name, table_name);
  END LOOP;
END $$;
