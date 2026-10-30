import { supabase } from "@/integrations/supabase/client";

export type InboxRole = "student" | "teacher";

export type ThreadSummary = {
  id: string;
  subject: string;
  educationLevel: string;
  status: string;
  createdAt: string;
  lastMessageAt: string;
  lastSenderRole: string;
  isGuest: boolean;
  counterpartName: string;
  teacherProfileId: string;
  preview: string;
  unread: boolean;
};

export const messageSchemaMax = 2000;

/** True when the other side has posted since I last opened the conversation. */
export function isUnread(myRole: InboxRole, lastSenderRole: string, lastMessageAt: string, myLastReadAt: string | null) {
  if (lastSenderRole === myRole) return false;
  if (!myLastReadAt) return true;
  return new Date(lastMessageAt).getTime() > new Date(myLastReadAt).getTime();
}

export function statusLabel(myRole: InboxRole, lastSenderRole: string, hasReplies: boolean) {
  if (!hasReplies && lastSenderRole === "student") return myRole === "teacher" ? "New enquiry" : "Waiting for reply";
  if (lastSenderRole === myRole) return myRole === "teacher" ? "Replied" : "Waiting for reply";
  return myRole === "teacher" ? "Student replied" : "Tutor replied";
}

async function nameMap(userIds: string[]) {
  if (!userIds.length) return new Map<string, string>();
  const { data } = await supabase.from("profiles").select("id, display_name").in("id", userIds);
  return new Map((data ?? []).map((p) => [p.id, p.display_name ?? ""]));
}

/** Enquiries for the signed-in user, newest activity first, with unread + latest-message preview. */
export async function fetchInbox(userId: string, role: InboxRole, teacherProfileId?: string): Promise<ThreadSummary[]> {
  let q = supabase.from("tutor_enquiries").select("*").order("last_message_at", { ascending: false }).limit(100);
  q = role === "teacher" ? q.eq("teacher_profile_id", teacherProfileId!) : q.eq("student_user_id", userId);
  const { data: enquiries, error } = await q;
  if (error) throw error;
  const rows = enquiries ?? [];
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);

  const [{ data: msgs }, { data: reads }] = await Promise.all([
    supabase.from("enquiry_messages").select("enquiry_id, body, created_at").in("enquiry_id", ids).order("created_at", { ascending: false }),
    supabase.from("enquiry_reads").select("enquiry_id, last_read_at").in("enquiry_id", ids).eq("user_id", userId),
  ]);
  const latest = new Map<string, string>();
  for (const m of msgs ?? []) if (!latest.has(m.enquiry_id)) latest.set(m.enquiry_id, m.body);
  const readAt = new Map((reads ?? []).map((r) => [r.enquiry_id, r.last_read_at]));

  let names = new Map<string, string>();
  if (role === "teacher") {
    names = await nameMap([...new Set(rows.map((r) => r.student_user_id).filter((x): x is string => !!x))]);
  } else {
    const tIds = [...new Set(rows.map((r) => r.teacher_profile_id))];
    const { data: tps } = await supabase.from("teacher_profiles").select("id, user_id").in("id", tIds);
    const byUser = await nameMap((tps ?? []).map((t) => t.user_id));
    names = new Map((tps ?? []).map((t) => [t.id, byUser.get(t.user_id) ?? ""]));
  }

  return rows.map((r) => ({
    id: r.id,
    subject: r.subject,
    educationLevel: r.education_level,
    status: statusLabel(role, r.last_sender_role, latest.has(r.id)),
    createdAt: r.created_at,
    lastMessageAt: r.last_message_at,
    lastSenderRole: r.last_sender_role,
    isGuest: !r.student_user_id,
    counterpartName:
      role === "teacher"
        ? r.student_user_id ? names.get(r.student_user_id) || "Student" : "Guest visitor"
        : names.get(r.teacher_profile_id) || "Your tutor",
    teacherProfileId: r.teacher_profile_id,
    preview: latest.get(r.id) ?? r.message ?? `${r.subject} · ${r.education_level}`,
    unread: isUnread(role, r.last_sender_role, r.last_message_at, readAt.get(r.id) ?? null),
  }));
}

export async function markRead(enquiryId: string, userId: string) {
  await supabase.from("enquiry_reads").upsert({ enquiry_id: enquiryId, user_id: userId, last_read_at: new Date().toISOString() });
}

export function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}
