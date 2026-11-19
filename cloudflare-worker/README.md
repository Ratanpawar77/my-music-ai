# My Music AI — Cloudflare Worker

This Worker securely calls the MiniMax Music 2.6 model through Cloudflare Workers AI. The model can create full songs with vocals from prompts and lyrics, or instrumental tracks.

## Deploy from the Cloudflare dashboard (phone-friendly)

1. Open the Cloudflare dashboard and sign in.
2. Open **Workers & Pages** → **Create** → **Worker**. Give it a name such as `my-music-ai-worker` and deploy the starter.
3. Open the new Worker and choose **Edit code**. Replace the starter code with the complete contents of `worker.js`, then save and deploy.
4. Open **Settings** → **Bindings** → **Add** → **Workers AI**. Set the variable name to exactly `AI`, save, and deploy.
5. Open **Settings** → **Variables and Secrets**. Add a secret named exactly `STUDIO_ACCESS_KEY`. Create a long private passphrase and keep it to yourself. Never put this value in GitHub or send it in chat.
6. Copy the Worker URL ending in `.workers.dev`.

## Connect the app

1. Open My Music AI on its GitHub Pages address.
2. In the **AI Vocals Studio** card, expand **Connect your private AI service**.
3. Paste your Worker URL and the same private passphrase used for `STUDIO_ACCESS_KEY`.
4. Tap **Save connection**, then **Test connection**.
5. Choose Female lead, Male lead, Duet or Instrumental only, then tap **Generate full AI song**.

## Security

- The Cloudflare Workers AI binding and `STUDIO_ACCESS_KEY` stay on Cloudflare's server; they are not stored in the public GitHub repository.
- The browser sends only the separate studio access code to the Worker.
- The Worker accepts browser requests only from `https://ratanpawar77.github.io`. If you use a different Pages/custom domain, change `ALLOWED_ORIGIN` in `worker.js` to that exact origin and redeploy.
- The app stores the Worker URL and studio access code in the current browser's local storage. Do not share your device/browser profile or access code.
- This is a personal-use gate, not a full user-account system. Do not publish the access code.

## Model and limitations

- Model ID: `minimax/music-2.6`.
- The model prompt asks for a male, female or duet vocal, but the result is prompt-guided rather than a guaranteed fixed voice identity.
- Marathi and Hindi pronunciation may vary. Check each generated output before publishing.
- Current model listing shows approximately **US$0.15 per generated track**. Confirm the current amount and your Cloudflare billing settings before generating. Generation is not free.
- If the model returns an error, check Workers & Pages → your Worker → Logs and the Workers AI usage/billing page.

## Optional Wrangler configuration

The `wrangler.toml` file in this folder declares the Workers AI binding for command-line deployment. The dashboard setup above does not require Wrangler or a computer.
