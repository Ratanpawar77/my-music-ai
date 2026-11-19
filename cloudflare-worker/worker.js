const ALLOWED_ORIGIN = "https://ratanpawar77.github.io";
const MODEL = "minimax/music-2.6";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Studio-Key",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

function cleanFilename(value) {
  const cleaned = String(value || "my-ai-song").normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 64);
  return cleaned || "my-ai-song";
}

const genres = {
  cinematic: "cinematic soundtrack",
  acoustic: "acoustic",
  lofi: "lo-fi",
  pop: "pop",
  folk: "folk-inspired",
  ambient: "ambient"
};
const moods = {
  emotional: "sad and emotional",
  hopeful: "hopeful and uplifting",
  romantic: "romantic and heartfelt",
  energetic: "energetic and powerful",
  devotional: "devotional and reverent",
  peaceful: "peaceful and calm"
};
const languages = { mr: "Marathi", hi: "Hindi", en: "English" };

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    if (origin !== ALLOWED_ORIGIN) return new Response("Origin not allowed", { status: 403 });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });

    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") {
      return json({
        ok: true,
        model: MODEL,
        accessConfigured: Boolean(env.STUDIO_ACCESS_KEY),
        aiBindingConfigured: Boolean(env.AI)
      });
    }

    if (url.pathname !== "/generate" || request.method !== "POST") return json({ error: "Route not found." }, 404);
    if (!env.STUDIO_ACCESS_KEY || !safeEqual(request.headers.get("X-Studio-Key") || "", env.STUDIO_ACCESS_KEY)) {
      return json({ error: "Access denied. Check the private access code saved in the app." }, 401);
    }
    if (!env.AI) return json({ error: "Workers AI binding is missing. Add a Workers AI binding named AI in Cloudflare." }, 500);

    const declaredLength = Number(request.headers.get("Content-Length") || 0);
    if (declaredLength > 24000) return json({ error: "The song request is too large." }, 413);

    let inputData;
    try {
      const raw = await request.text();
      if (new TextEncoder().encode(raw).byteLength > 24000) return json({ error: "The song request is too large." }, 413);
      inputData = JSON.parse(raw);
    } catch (_) {
      return json({ error: "The request body must be valid JSON." }, 400);
    }

    const voice = String(inputData.voice || "female");
    if (!["female", "male", "duet", "instrumental"].includes(voice)) return json({ error: "Choose a supported singer option." }, 400);
    const language = languages[inputData.language];
    if (!language) return json({ error: "Choose Marathi, Hindi or English lyrics." }, 400);

    const title = String(inputData.title || "Untitled song").trim().slice(0, 80);
    const idea = String(inputData.idea || "").trim().slice(0, 500);
    const lyrics = String(inputData.lyrics || "").trim();
    if (lyrics.length > 3500) return json({ error: "Lyrics must be 3,500 characters or fewer." }, 400);
    const mood = moods[inputData.mood] || moods.emotional;
    const genre = genres[inputData.genre] || genres.cinematic;
    const tempo = Math.min(145, Math.max(55, Number(inputData.tempo) || 82));
    const musicalKey = /^[A-G](#)?$/.test(String(inputData.key || "")) ? String(inputData.key) : "C";

    const singerDirection = {
      female: "a solo female lead singer with a warm, expressive voice; keep the female lead clearly in front",
      male: "a solo male lead singer with a warm, expressive voice; keep the male lead clearly in front",
      duet: "a male and female vocal duet, alternating lines in the verses and singing together in the chorus",
      instrumental: "instrumental only, with absolutely no lead or backing vocals"
    }[voice];

    const prompt = [
      "Create a complete, original, professionally arranged song.",
      "Title: " + title + ".",
      "Language: " + language + "; sing clearly in this language.",
      "Style: " + genre + "; mood: " + mood + ".",
      "Tempo: approximately " + tempo + " BPM; musical key: " + musicalKey + ".",
      "Vocal direction: " + singerDirection + ".",
      idea ? "Story and emotional direction: " + idea + "." : "",
      "Use a coherent verse and chorus structure, a memorable melody, balanced instruments and a clean mix.",
      "Do not imitate any named artist or existing song."
    ].filter(Boolean).join(" ");

    try {
      const modelInput = {
        prompt,
        is_instrumental: voice === "instrumental",
        lyrics_optimizer: voice !== "instrumental" && !lyrics,
        format: "mp3",
        sample_rate: 44100
      };
      if (voice !== "instrumental" && lyrics) modelInput.lyrics = lyrics;

      const generated = await env.AI.run(MODEL, modelInput);
      const audioUrl = generated && (generated.audio || (generated.result && generated.result.audio));
      if (typeof audioUrl !== "string" || !audioUrl.startsWith("https://")) {
        console.error("Unexpected model response shape.");
        return json({ error: "The music model did not return a downloadable audio file. Check the Cloudflare Workers AI logs." }, 502);
      }

      const audioLocation = new URL(audioUrl);
      if (!audioLocation.hostname.endsWith(".aliyuncs.com")) {
        console.error("Unexpected audio delivery host:", audioLocation.hostname);
        return json({ error: "The music model returned an unsupported audio download host." }, 502);
      }

      const audioResponse = await fetch(audioLocation.toString());
      if (!audioResponse.ok || !audioResponse.body) {
        return json({ error: "The song was generated, but its audio file could not be downloaded from the provider." }, 502);
      }

      return new Response(audioResponse.body, {
        status: 200,
        headers: {
          ...corsHeaders(),
          "Content-Type": "audio/mpeg",
          "Content-Disposition": 'attachment; filename="' + cleanFilename(title) + '.mp3"',
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff"
        }
      });
    } catch (error) {
      console.error("Music generation failed:", error && error.message ? error.message : "Unknown error");
      return json({ error: "Music generation failed. Check your Cloudflare AI access, model availability and usage billing, then try again." }, 502);
    }
  }
};
