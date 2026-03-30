/**
 * storage.ts — Platform-adaptive storage layer
 *
 * On native (Capacitor iOS/Android): uses @capacitor/preferences for durable
 * key-value persistence that survives app restarts.
 *
 * On web/Vercel: falls back to localStorage transparently.
 *
 * The `initStorage()` function MUST be awaited before the first render so that
 * synchronous reads via `storage.getItem()` return accurate values that were
 * previously persisted on native.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

// ── Web adapter (synchronous localStorage) ────────────────────────────────────

const webAdapter: StorageAdapter = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* storage quota exceeded or private browse — silently ignore */
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch { /* ignore */ }
  },
};

// ── In-memory cache (seeded from @capacitor/preferences on native) ─────────────

const memoryCache: Record<string, string> = {};

const nativeAdapter: StorageAdapter = {
  getItem: (key) => memoryCache[key] ?? localStorage.getItem(key) ?? null,
  setItem: (key, value) => {
    memoryCache[key] = value;
    // Write through to localStorage as a fallback / secondary store
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
    // Fire-and-forget write to @capacitor/preferences (non-blocking)
    import('@capacitor/preferences').then(({ Preferences }) => {
      Preferences.set({ key, value }).catch(() => { /* ignore */ });
    }).catch(() => { /* not native */ });
  },
  removeItem: (key) => {
    delete memoryCache[key];
    try { localStorage.removeItem(key); } catch { /* ignore */ }
    import('@capacitor/preferences').then(({ Preferences }) => {
      Preferences.remove({ key }).catch(() => { /* ignore */ });
    }).catch(() => { /* not native */ });
  },
};

// ── Active adapter — starts as web, upgraded to native after init ──────────────

let _adapter: StorageAdapter = webAdapter;

export const storage: StorageAdapter = {
  getItem:    (key)        => _adapter.getItem(key),
  setItem:    (key, value) => _adapter.setItem(key, value),
  removeItem: (key)        => _adapter.removeItem(key),
};

// ── initStorage ───────────────────────────────────────────────────────────────
/**
 * Call once before the first React render (see main.tsx).
 * On native, loads all @capacitor/preferences entries into the memory cache
 * so that synchronous reads via `storage.getItem()` see the correct values
 * on startup.
 * On web the function resolves immediately with no side-effects.
 */
export async function initStorage(): Promise<void> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;

    const { Preferences } = await import('@capacitor/preferences');
    const { keys } = await Preferences.keys();

    await Promise.all(
      keys.map(async (key) => {
        const { value } = await Preferences.get({ key });
        if (value !== null) {
          memoryCache[key] = value;
          // Also seed localStorage so legacy code reading it directly sees values
          try { localStorage.setItem(key, value); } catch { /* ignore */ }
        }
      }),
    );

    // Switch to the native adapter now that the cache is warm
    _adapter = nativeAdapter;
  } catch {
    // Not on native or @capacitor packages not installed — stay on webAdapter
  }
}
