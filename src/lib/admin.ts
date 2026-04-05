const DEFAULT_ADMIN_EMAILS = ["mahesh.sangawar@gmail.com"];

export function getAdminEmails(): string[] {
  const configured = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return configured.length > 0 ? configured : DEFAULT_ADMIN_EMAILS;
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) {
    return false;
  }

  return getAdminEmails().includes(email.toLowerCase());
}
