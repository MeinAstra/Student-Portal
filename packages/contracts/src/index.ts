import { z } from "zod";
export { ZodError } from "zod";

const id = z.string().uuid();
const shortText = z.string().trim().min(1).max(160);
const bodyText = z.string().trim().min(1).max(2000);
const optionalText = z.string().trim().max(300).default("");
const date = z.iso.date();

export const safeExternalUrl = z.string().trim().max(2048).transform((value, context) => {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") throw new Error("HTTPS required");
    if (parsed.username || parsed.password) throw new Error("Credentials are not allowed in URLs");
    return parsed.toString();
  } catch {
    context.addIssue({ code: "custom", message: "Enter a valid HTTPS URL without embedded credentials." });
    return z.NEVER;
  }
});

export const optionalExternalUrl = z.union([z.literal(""), safeExternalUrl]).default("");

export const visibilitySchema = z.object({ visible: z.boolean().default(true) });

export const noticeInput = z.object({
  title: shortText,
  summary: bodyText,
  category: shortText,
  publishDate: date,
  expiryDate: z.union([z.literal(""), date]).default(""),
  imageUrl: optionalExternalUrl,
  visible: z.boolean().default(true)
}).strict().refine((value) => !value.expiryDate || value.expiryDate >= value.publishDate, { message: "Expiry date cannot be before publish date.", path: ["expiryDate"] });

export const eventInput = z.object({
  title: shortText,
  description: bodyText,
  date,
  location: shortText,
  category: shortText,
  registrationUrl: optionalExternalUrl,
  visible: z.boolean().default(true)
}).strict();

export const directoryEntryInput = z.object({
  name: shortText,
  role: shortText,
  department: shortText,
  email: z.union([z.literal(""), z.email().max(254)]).default(""),
  location: optionalText,
  visible: z.boolean().default(true)
}).strict();

export const resourceInput = z.object({
  title: shortText,
  description: bodyText,
  category: shortText,
  url: optionalExternalUrl,
  visible: z.boolean().default(true)
}).strict();

export const supportContactInput = z.object({
  section: z.enum(["health_emergency", "wellbeing", "community_safety"]),
  title: shortText,
  description: bodyText,
  contactLabel: optionalText,
  url: optionalExternalUrl,
  visible: z.boolean().default(true)
}).strict();

export const feedbackFormInput = z.object({
  name: shortText,
  url: safeExternalUrl,
  visible: z.boolean().default(true)
}).strict();

export const campusMapInput = z.object({
  title: shortText,
  description: bodyText,
  imageUrl: optionalExternalUrl,
  visible: z.boolean().default(true)
}).strict();

export const portalStatusInput = z.object({
  message: z.string().trim().max(300).default("")
}).strict();

export const assetMetadataInput = z.object({
  name: shortText,
  url: safeExternalUrl,
  altText: shortText,
  mediaType: z.enum(["image", "document"]),
  visible: z.boolean().default(true)
}).strict();

export const collectionSchemas = {
  notices: noticeInput,
  events: eventInput,
  directory: directoryEntryInput,
  resources: resourceInput,
  support: supportContactInput,
  feedbackForms: feedbackFormInput,
  assets: assetMetadataInput
} as const;

export type CollectionName = keyof typeof collectionSchemas;
export const collectionName = z.enum(Object.keys(collectionSchemas) as [CollectionName, ...CollectionName[]]);

export type NoticeInput = z.infer<typeof noticeInput>;
export type EventInput = z.infer<typeof eventInput>;
export type DirectoryEntryInput = z.infer<typeof directoryEntryInput>;
export type ResourceInput = z.infer<typeof resourceInput>;
export type SupportContactInput = z.infer<typeof supportContactInput>;
export type FeedbackFormInput = z.infer<typeof feedbackFormInput>;
export type CampusMapInput = z.infer<typeof campusMapInput>;
export type PortalStatusInput = z.infer<typeof portalStatusInput>;
export type AssetMetadataInput = z.infer<typeof assetMetadataInput>;

export type RecordWithMeta<T> = T & {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export const loginInput = z.object({
  email: z.email().max(254),
  password: z.string().min(12).max(200)
}).strict();

export const demoAccountInput = z.object({
  email: z.email().max(254).refine((value) => {
    const domain = value.split("@")[1]?.toLowerCase();
    return domain === "example.com" || domain === "example.edu" || Boolean(domain?.endsWith(".example"));
  }, "Use a reserved example domain."),
  displayName: z.string().trim().min(1).max(120)
}).strict();

export const role = z.enum(["viewer", "content_admin"]);
export type Role = z.infer<typeof role>;

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  roles: Role[];
}

export interface SessionState {
  user: SessionUser | null;
  csrfToken: string | null;
  writeMode: "readonly" | "local";
}

export interface PublicContent {
  notices: Array<RecordWithMeta<NoticeInput>>;
  events: Array<RecordWithMeta<EventInput>>;
  directory: Array<RecordWithMeta<DirectoryEntryInput>>;
  resources: Array<RecordWithMeta<ResourceInput>>;
  support: Array<RecordWithMeta<SupportContactInput>>;
  feedbackForms: Array<RecordWithMeta<FeedbackFormInput>>;
  assets: Array<RecordWithMeta<AssetMetadataInput>>;
  campusMap: (RecordWithMeta<CampusMapInput>) | null;
  portalStatus: (RecordWithMeta<PortalStatusInput>) | null;
}

export const recordId = z.object({ id });
