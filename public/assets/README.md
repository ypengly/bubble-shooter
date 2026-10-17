# Assets

The game ships with **no external asset files**: every bubble, icon, background and
sound effect is generated procedurally at startup (see `src/systems/TextureFactory.ts`
and `src/systems/AudioManager.ts`), so `npm install && npm run dev` works out of the box.

To override with real art or audio, list files in `src/config/AssetConfig.ts`.
Anything that fails to load falls back to the generated version.
