import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasSupabaseServiceRole = Boolean(serviceRoleKey);

if (!serviceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is required to create supabaseAdmin");
}

const requiredServiceRoleKey = serviceRoleKey;

export const supabaseAdmin = createClient(supabaseUrl, requiredServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
