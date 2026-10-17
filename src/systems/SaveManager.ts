import type { LevelProgress, SaveData, Settings } from '../types/GameTypes';

const KEY = 'bubble-shooter-save-v1';

export const DEFAULT_SETTINGS: Settings = { music: true, sound: true, reducedEffects: false, aimGuide: true };

function freshSave(): SaveData {
  return { version: 1, unlockedLevel: 1, progress: {}, highScore: 0, bestCombo: 0, settings: { ...DEFAULT_SETTINGS } };
}

/** Single access point for persistence. Falls back to memory if localStorage is unavailable. */
class SaveManagerImpl {
  private data: SaveData = freshSave();
  private storage: Storage | null = null;
  private loaded = false;

  private ensure(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const probe = '__bs_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      this.storage = window.localStorage;
    } catch {
      this.storage = null;
    }
    try {
      const raw = this.storage?.getItem(KEY);
      if (raw) this.data = this.sanitize(JSON.parse(raw));
    } catch {
      this.data = freshSave();
    }
  }

  private sanitize(raw: unknown): SaveData {
    const base = freshSave();
    if (typeof raw !== 'object' || raw === null) return base;
    const r = raw as Partial<SaveData>;
    if (typeof r.unlockedLevel === 'number' && r.unlockedLevel >= 1) base.unlockedLevel = Math.floor(r.unlockedLevel);
    if (typeof r.highScore === 'number') base.highScore = r.highScore;
    if (typeof r.bestCombo === 'number') base.bestCombo = r.bestCombo;
    if (r.progress && typeof r.progress === 'object') {
      for (const [k, v] of Object.entries(r.progress)) {
        const p = v as Partial<LevelProgress>;
        if (typeof p?.stars === 'number' && typeof p?.highScore === 'number') {
          base.progress[Number(k)] = { stars: Math.min(3, Math.max(0, p.stars)), highScore: p.highScore };
        }
      }
    }
    if (r.settings && typeof r.settings === 'object') {
      const s = r.settings as Partial<Settings>;
      for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) if (typeof s[key] === 'boolean') base.settings[key] = s[key] as boolean;
    }
    return base;
  }

  private save(): void {
    try {
      this.storage?.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* storage full or blocked: keep playing in memory */
    }
  }

  get settings(): Settings {
    this.ensure();
    return this.data.settings;
  }

  updateSettings(patch: Partial<Settings>): void {
    this.ensure();
    Object.assign(this.data.settings, patch);
    this.save();
  }

  get unlockedLevel(): number {
    this.ensure();
    return this.data.unlockedLevel;
  }

  get highScore(): number {
    this.ensure();
    return this.data.highScore;
  }

  get bestCombo(): number {
    this.ensure();
    return this.data.bestCombo;
  }

  get totalStars(): number {
    this.ensure();
    return Object.values(this.data.progress).reduce((a, p) => a + p.stars, 0);
  }

  isUnlocked(levelId: number): boolean {
    return levelId <= this.unlockedLevel;
  }

  getProgress(levelId: number): LevelProgress | null {
    this.ensure();
    return this.data.progress[levelId] ?? null;
  }

  noteCombo(combo: number): void {
    this.ensure();
    if (combo > this.data.bestCombo) {
      this.data.bestCombo = combo;
      this.save();
    }
  }

  /** Records a win. Returns whether it was a new best score / more stars. */
  recordWin(levelId: number, score: number, stars: number, nextLevelId: number | null): { newBest: boolean; moreStars: boolean } {
    this.ensure();
    const prev = this.data.progress[levelId];
    const newBest = !prev || score > prev.highScore;
    const moreStars = !prev || stars > prev.stars;
    this.data.progress[levelId] = { stars: Math.max(prev?.stars ?? 0, stars), highScore: Math.max(prev?.highScore ?? 0, score) };
    if (score > this.data.highScore) this.data.highScore = score;
    if (nextLevelId !== null && nextLevelId > this.data.unlockedLevel) this.data.unlockedLevel = nextLevelId;
    this.save();
    return { newBest, moreStars };
  }

  reset(): void {
    this.ensure();
    const settings = { ...this.data.settings };
    this.data = freshSave();
    this.data.settings = settings;
    this.save();
  }
}

export const SaveManager = new SaveManagerImpl();
