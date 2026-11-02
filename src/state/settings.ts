import { create } from 'zustand';
import type { Lang, Quality } from '../types';

const KEY = 'ar-shooter:settings';

export interface SettingsState {
  sound: boolean;
  vibration: boolean;
  quality: Quality;
  language: Lang;
  /** o tutorial já foi visto uma vez */
  tutorialSeen: boolean;
  /** estado de UI (não persistido) */
  tutorialOpen: boolean;
  settingsOpen: boolean;

  update: (patch: Partial<Pick<SettingsState, 'sound' | 'vibration' | 'quality' | 'language' | 'tutorialSeen'>>) => void;
  openTutorial: () => void;
  closeTutorial: () => void;
  openSettings: () => void;
  closeSettings: () => void;
}

type Persisted = Pick<SettingsState, 'sound' | 'vibration' | 'quality' | 'language' | 'tutorialSeen'>;

function defaultLanguage(): Lang {
  try {
    const l = navigator.language?.toLowerCase() ?? 'pt';
    return l.startsWith('pt') ? 'pt' : 'en';
  } catch {
    return 'pt';
  }
}

function load(): Persisted {
  const defaults: Persisted = { sound: true, vibration: true, quality: 'auto', language: defaultLanguage(), tutorialSeen: false };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return {
      sound: parsed.sound ?? defaults.sound,
      vibration: parsed.vibration ?? defaults.vibration,
      quality: parsed.quality ?? defaults.quality,
      language: parsed.language === 'en' || parsed.language === 'pt' ? parsed.language : defaults.language,
      tutorialSeen: parsed.tutorialSeen ?? false,
    };
  } catch {
    return defaults;
  }
}

function save(s: Persisted) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* armazenamento indisponível */
  }
}

export const useSettings = create<SettingsState>((set, get) => ({
  ...load(),
  tutorialOpen: false,
  settingsOpen: false,

  update: (patch) => {
    set(patch);
    const { sound, vibration, quality, language, tutorialSeen } = get();
    save({ sound, vibration, quality, language, tutorialSeen });
  },
  openTutorial: () => set({ tutorialOpen: true }),
  closeTutorial: () => {
    set({ tutorialOpen: false });
    if (!get().tutorialSeen) get().update({ tutorialSeen: true });
  },
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
}));
