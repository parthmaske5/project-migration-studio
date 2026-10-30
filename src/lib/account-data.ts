import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/account";

/** Roles attached to the signed-in account (one identity, many roles). */
export async function getMyRoles(userId: string): Promise<AppRole[]> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw error;
  return (data ?? [])
    .map((r) => r.role as string)
    .filter((r): r is AppRole => r === "student" || r === "teacher");
}

/** Attach a role (and its empty role profile) to an existing account. */
export async function ensureRoleProfile(userId: string, role: AppRole): Promise<void> {
  const { error: roleError } = await supabase
    .from("user_roles")
    .upsert({ user_id: userId, role }, { onConflict: "user_id,role", ignoreDuplicates: true });
  if (roleError) throw roleError;

  const table = role === "student" ? "student_profiles" : "teacher_profiles";
  const { error } = await supabase
    .from(table)
    .upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
  if (error) throw error;
}

/** Sign out and clear cached account data; caller navigates afterwards. */
export async function signOutEverywhere() {
  await supabase.auth.signOut();
}
