/**
 * Server-side helper for querying the OpenStreetMap Overpass API.
 *
 * Instead of trying each mirror one-by-one (which means a single slow
 * mirror blocks the whole request even if the others are fast), this
 * fires the query at ALL mirrors simultaneously and returns whichever
 * responds first. The losers are aborted immediately to avoid wasting
 * capacity on the shared public Overpass infrastructure.
 */

export const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://api-overpass.osm.ch/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

export async function queryOverpass(query: string, timeoutMs = 8000): Promise<any> {
  const controllers = OVERPASS_MIRRORS.map(() => new AbortController());

  const attempts = OVERPASS_MIRRORS.map((url, i) =>
    fetch(url, {
      method: "POST",
      body: "data=" + encodeURIComponent(query),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "JakScope/1.0 (contact@jakscope.org)",
      },
      signal: controllers[i].signal,
    }).then(async (res) => {
      if (!res.ok) {
        throw new Error(`Overpass mirror ${url} returned status ${res.status}`);
      }
      return res.json();
    })
  );

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("JakScope tidak merespons dalam waktu yang wajar")), timeoutMs);
  });

  try {
    const result = await Promise.race([Promise.any(attempts), timeoutPromise]);
    // We have a winner — cancel the still-pending requests to the other mirrors.
    controllers.forEach((c) => c.abort());
    return result;
  } catch (err: any) {
    controllers.forEach((c) => c.abort());
    if (err instanceof AggregateError) {
      const messages = err.errors.map((e: any) => e?.message || String(e)).join("; ");
      throw new Error(`Semua mirror JakScope gagal merespons: ${messages}`);
    }
    throw err;
  }
}
