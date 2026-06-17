/** Email notification categories stored on profiles.notification_settings.
 *  Opt-out model: a category is ON unless the user explicitly set it false.
 *  Shared by the account UI, the email senders, and the unsubscribe endpoint so
 *  the toggles are actually honored (they previously were not). */
export type EmailCategory =
  | "messages_email" // someone replied in a conversation
  | "quotes_email" // customer: an artist sent / updated a quote
  | "leads_email" // artist: a new matched lead + the weekly digest
  | "activity_email" // a quote was accepted / a job was booked
  | "reviews_email" // customer: reminder to review after a tattoo
  | "newsletter_email" // marketing newsletter (future)
  | "offers_email"; // offers / promotions (future)

export const EMAIL_CATEGORIES: EmailCategory[] = [
  "messages_email",
  "quotes_email",
  "leads_email",
  "activity_email",
  "reviews_email",
  "newsletter_email",
  "offers_email",
];

export function isEmailCategory(v: string): v is EmailCategory {
  return (EMAIL_CATEGORIES as string[]).includes(v);
}

/** True unless the recipient explicitly turned this category off. */
export function emailAllowed(settings: unknown, category: EmailCategory): boolean {
  const s = settings as Record<string, unknown> | null | undefined;
  return !s || s[category] !== false;
}
