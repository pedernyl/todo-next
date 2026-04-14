import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

const key = serviceRoleKey || anonKey;

export const hasSupabaseServiceRole = Boolean(serviceRoleKey);

export const supabaseAdmin = createClient(supabaseUrl, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
