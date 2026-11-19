(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const URL_KEY = "my_music_ai_gateway_url_v1";
  const state = { busy: false, jobId: null, audioUrl: null, audioBlob: null, filename: "my-music-ai-song.mp3" };

  function setStatus(message, isError = false) {
    const node = $("aiGenerationStatus");
    node.textContent = message;
    node.classList.toggle("error", isError);
  }

  function baseUrl() {
    const value = $("aiServerUrl").value.trim().replace(/\/+$/, "");
    if (!value) throw new Error("Enter your AI gateway URL first.");
    const url = new URL(value);
    if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
      throw new Error("Use an HTTPS URL for your public AI gateway.");
    }
    return value;
  }

  function appKey() {
    const key = $("aiGatewayKey").value.trim() || sessionStorage.getItem("my_music_ai_gateway_key_v1") || "";
    if (!key) throw new Error("Enter the private gateway access key.");
    return key;
  }

  async function api(path, options = {}) {
    const headers = Object.assign({}, options.headers || {}, { "X-App-Key": appKey() });
    if (options.body) headers["Content-Type"] = "application/json";
    const response = await fetch(baseUrl() + path, Object.assign({}, options, { headers }));
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || data.error || ("Gateway error " + response.status));
    return data;
  }

  function saveSettings() {
    try {
      const url = baseUrl();
      const key = $("aiGatewayKey").value.trim();
      localStorage.setItem(URL_KEY, url);
      if (key) sessionStorage.setItem("my_music_ai_gateway_key_v1", key);
      $("aiGatewayKey").value = "";
      setStatus("Connection settings saved on this device. The access key stays in this browser session.");
    } catch (error) {
      setStatus(error.message, true);
    }
  }

  async function testConnection() {
    try {
      $("testAiConnection").disabled = true;
      setStatus("Checking your AI server…");
      const response = await fetch(baseUrl() + "/api/health", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.detail || "The model server is not ready.");
      setStatus("Connected. " + (data.model_server || "ACE-Step") + " is responding. You can generate a song.");
    } catch (error) {
      setStatus(error.message + " Check the URL, gateway and CORS settings.", true);
    } finally {
      $("testAiConnection").disabled = false;
    }
  }

  function buildPrompt() {
    const title = $("songTitle").value.trim() || "Untitled song";
    const idea = $("idea").value.trim();
    const mood = $("mood").selectedOptions[0].textContent;
    const genre = $("genre").selectedOptions[0].textContent;
    const key = $("key").value;
    const tempo = Number($("tempo").value);
    return "Create an original complete song titled " + title + ". " + idea +
      ". Style: " + genre + ". Mood: " + mood + ". Tempo around " + tempo +
      " BPM, musical key " + key + ". Clear arrangement, memorable melody, balanced studio mix.";
  }

  function setBusy(value) {
    state.busy = value;
    $("generateAiSong").disabled = value;
    $("generateAiSong").textContent = value ? "Generating your song…" : "♫ Generate full song with AI";
  }

  async function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  async function generateSong() {
    if (state.busy) return;
    let audioObjectUrl = null;
    try {
      setBusy(true);
      $("aiGeneratedResult").hidden = true;
      setStatus("Sending your song idea to ACE-Step…");
      const request = {
        prompt: buildPrompt(),
        lyrics: $("lyrics").value.trim(),
        language: $("freeAiLanguage").value,
        voice: $("freeAiVoice").value,
        duration: Number($("aiDuration").value),
        bpm: Number($("tempo").value),
        key_scale: $("key").value
      };
      const created = await api("/api/generate", { method: "POST", body: JSON.stringify(request) });
      const jobId = created.job_id;
      if (!jobId) throw new Error("The gateway did not return a generation job ID.");
      state.jobId = jobId;

      let completed = false;
      for (let attempt = 0; attempt < 180; attempt += 1) {
        setStatus("AI generation running… Checking progress (" + (attempt + 1) + "/180). Keep this page open.");
        await wait(4000);
        const job = await api("/api/jobs/" + encodeURIComponent(jobId));
        if (job.status === "completed") {
          completed = true;
          setStatus("Your song is ready. Download it or save it to your local library.");
          const response = await fetch(baseUrl() + job.audio_url, { headers: { "X-App-Key": appKey() } });
          if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || "The generated MP3 could not be downloaded.");
          }
          state.audioBlob = await response.blob();
          state.filename = job.filename || "my-music-ai-song.mp3";
          if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
          state.audioUrl = URL.createObjectURL(state.audioBlob);
          $("aiGeneratedPlayer").src = state.audioUrl;
          $("aiGeneratedPlayer").hidden = false;
          $("aiGeneratedResult").hidden = false;
          break;
        }
        if (job.status === "failed") throw new Error(job.message || "The model could not generate this song.");
        if (job.message) setStatus(job.message);
      }
      if (!completed) throw new Error("This generation is taking longer than expected. Your job may still be running; try again later.");
    } catch (error) {
      setStatus(error.message || "Song generation failed.", true);
    } finally {
      setBusy(false);
    }
  }

  function downloadSong() {
    if (!state.audioBlob) return;
    const link = document.createElement("a");
    link.href = state.audioUrl;
    link.download = state.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function saveSongToLibrary() {
    if (!state.audioBlob) {
      setStatus("Generate a song before saving it.", true);
      return;
    }
    try {
      const file = new File([state.audioBlob], state.filename, { type: state.audioBlob.type || "audio/mpeg" });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      $("importAudioFile").files = transfer.files;
      $("importAudioButton").click();
      setStatus("Sending your generated MP3 to the existing My Music AI library…");
    } catch (error) {
      setStatus("Could not add this audio to the library. Use Download MP3 instead.", true);
    }
  }

  $("saveAiSettings").addEventListener("click", saveSettings);
  $("testAiConnection").addEventListener("click", testConnection);
  $("generateAiSong").addEventListener("click", generateSong);
  $("downloadGeneratedSong").addEventListener("click", downloadSong);
  $("saveGeneratedSong").addEventListener("click", saveSongToLibrary);

  const savedUrl = localStorage.getItem(URL_KEY);
  if (savedUrl) $("aiServerUrl").value = savedUrl;
  // Session-only secret: it is deliberately not written to localStorage or GitHub.
  $("aiGatewayKey").value = sessionStorage.getItem("my_music_ai_gateway_key_v1") || "";
})();
