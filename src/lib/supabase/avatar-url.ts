export function getAvatarPublicUrl(avatarPath: string | null | undefined): string | null {
  if (!avatarPath) {
    return null;
  }

  if (avatarPath.startsWith("http")) {
    return avatarPath;
  }

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) {
    return null;
  }

  return `${base}/storage/v1/object/public/avatars/${avatarPath}`;
}
