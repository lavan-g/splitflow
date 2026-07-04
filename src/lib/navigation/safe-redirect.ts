const ALLOWED_REDIRECT_PREFIXES = [
  "/dashboard",
  "/groups",
  "/expenses",
  "/settlements",
  "/profile",
];

export function getGroupInvitePath(groupCode: string) {
  return `/groups/join/${encodeURIComponent(groupCode.toUpperCase())}`;
}

export function getSafeRedirectPath(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }

  const isAllowed = ALLOWED_REDIRECT_PREFIXES.some(
    (prefix) => trimmed === prefix || trimmed.startsWith(`${prefix}/`),
  );

  return isAllowed ? trimmed : null;
}
