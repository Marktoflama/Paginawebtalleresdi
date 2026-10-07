/** Only allow same-origin relative paths as post-login destinations (no open redirects). */
export function safeNextPath(value: string | null | undefined, fallback = "/reservar"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.startsWith("/acceso") || value.startsWith("/auth")) return fallback;
  return value;
}
