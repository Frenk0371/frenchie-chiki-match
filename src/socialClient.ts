import { getValidSession } from "./cloudClient";

const SUPABASE_URL = "https://xrkqeelwutjzyqxgvxmm.supabase.co";
const SUPABASE_KEY = "sb_publishable_vQVI5HTbjy6lrDZLmoJfkw_ulzJMIkO";

export type SocialRelation = {
  relationship_id: string;
  username: string;
  relation: "incoming" | "outgoing" | "accepted";
  unlocked_level: number;
  total_stars: number;
  updated_at: string;
};

const parseResponse = async (response: Response) => {
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try { body = JSON.parse(text); }
    catch { body = text; }
  }
  if (!response.ok) {
    const maybe = body as { message?: string; error?: string } | null;
    throw new Error(maybe?.message || maybe?.error || `Errore ${response.status}`);
  }
  return body;
};

const rpc = async (name: string, payload: Record<string, unknown> = {}) => {
  const session = await getValidSession();
  if (!session?.access_token) throw new Error("Sessione scaduta. Accedi di nuovo.");
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
};

export const fetchSocialOverview = async (): Promise<SocialRelation[]> => {
  const rows = (await rpc("chiki_get_social_overview")) as SocialRelation[];
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    ...row,
    unlocked_level: Math.max(1, Number(row.unlocked_level) || 1),
    total_stars: Math.max(0, Number(row.total_stars) || 0),
  }));
};

export const sendFriendRequest = async (username: string) =>
  String(await rpc("chiki_send_friend_request", { p_username: username }));

export const respondFriendRequest = async (relationshipId: string, accept: boolean) =>
  String(await rpc("chiki_respond_friend_request", {
    p_request_id: relationshipId,
    p_accept: accept,
  }));
