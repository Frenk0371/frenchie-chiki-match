// Compatibility layer for the original cloud client, which was released when the campaign stopped at level 100.
// It only adjusts progress upserts; authentication and all other requests remain untouched.
const originalFetch = window.fetch.bind(window);

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  if (
    url.includes("/rest/v1/chiki_progress?on_conflict=user_id") &&
    init?.method?.toUpperCase() === "POST" &&
    typeof init.body === "string"
  ) {
    try {
      const payload = JSON.parse(init.body) as Array<Record<string, unknown>>;
      if (Array.isArray(payload) && payload[0]) {
        const localLevel = Math.max(1, Math.min(500, Number(localStorage.getItem("chiki-unlocked-level") || "1")));
        const sentLevel = Math.max(1, Number(payload[0].unlocked_level || 1));
        payload[0].unlocked_level = Math.min(500, Math.max(sentLevel, localLevel));
        return originalFetch(input, { ...init, body: JSON.stringify(payload) });
      }
    } catch {
      // Fall through to the untouched request if the payload is not the expected progress upsert.
    }
  }
  return originalFetch(input, init);
};
