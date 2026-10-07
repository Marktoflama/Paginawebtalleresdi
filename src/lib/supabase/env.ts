export interface SupabasePublicEnv {
  url: string;
  publishableKey: string;
}

/** Public Supabase settings. `null` when the project isn't configured yet. */
export function supabasePublicEnv(): SupabasePublicEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}

export function isSupabaseConfigured(): boolean {
  return supabasePublicEnv() !== null;
}
