import { useEffect } from 'react';
import { Capacitor, SystemBarType, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { useLocation } from 'react-router-dom';

interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

const OPAQUE_WHITE: RgbaColor = { r: 255, g: 255, b: 255, a: 1 };
const TOP_PROBE_PADDING = 24;
const BOTTOM_PROBE_OFFSET = 88;
const LIGHT_SURFACE_THRESHOLD = 0.72;
const SPLASH_RUST = '#b45309';
const SPLASH_GLOW = '#c67a3a';
const APP_SURFACE_LIGHT = '#ffffff';
const APP_SURFACE_DARK = '#121212';

function getAppSurface(): string {
  return document.documentElement.classList.contains('dark') ? APP_SURFACE_DARK : APP_SURFACE_LIGHT;
}

type SurfaceTone = 'light' | 'dark';

interface ResolvedSystemBars {
  navigationBarColor: string;
  navigationBarTone: SurfaceTone;
  statusBarColor: string;
  statusBarTone: SurfaceTone;
}

interface ExplicitSurfaceHint {
  navigationBarColor?: string;
  statusBarColor?: string;
  tone?: SurfaceTone;
}

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function parseCssColor(value: string | null | undefined): RgbaColor | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (
    !normalized ||
    normalized === 'transparent' ||
    normalized === 'rgba(0, 0, 0, 0)' ||
    normalized === 'rgba(0,0,0,0)'
  ) {
    return null;
  }

  if (normalized.startsWith('#')) {
    const hex = normalized.slice(1);

    if (hex.length === 3 || hex.length === 4) {
      const [r, g, b, a = 'f'] = hex.split('');
      return {
        r: parseInt(r + r, 16),
        g: parseInt(g + g, 16),
        b: parseInt(b + b, 16),
        a: parseInt(a + a, 16) / 255,
      };
    }

    if (hex.length === 6 || hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
      };
    }
  }

  const match = normalized.match(/^rgba?\(([^)]+)\)$/);
  if (!match) {
    return null;
  }

  const parts = match[1].split(',').map((part) => part.trim());
  if (parts.length < 3) {
    return null;
  }

  return {
    r: clampChannel(Number.parseFloat(parts[0])),
    g: clampChannel(Number.parseFloat(parts[1])),
    b: clampChannel(Number.parseFloat(parts[2])),
    a: parts[3] ? Math.max(0, Math.min(1, Number.parseFloat(parts[3]))) : 1,
  };
}

function overlayColor(foreground: RgbaColor, background: RgbaColor): RgbaColor {
  const alpha = foreground.a;

  return {
    r: clampChannel(foreground.r * alpha + background.r * (1 - alpha)),
    g: clampChannel(foreground.g * alpha + background.g * (1 - alpha)),
    b: clampChannel(foreground.b * alpha + background.b * (1 - alpha)),
    a: 1,
  };
}

function resolveElementBackground(element: Element | null): RgbaColor {
  const stack: HTMLElement[] = [];
  let current = element instanceof HTMLElement ? element : document.body;

  while (current) {
    stack.unshift(current);
    current = current.parentElement;
  }

  let color = OPAQUE_WHITE;
  for (const node of stack) {
    const parsed = parseCssColor(window.getComputedStyle(node).backgroundColor);
    if (parsed) {
      color = overlayColor(parsed, color);
    }
  }

  return color;
}

function sampleViewportColor(x: number, y: number): RgbaColor {
  const safeX = Math.min(window.innerWidth - 1, Math.max(1, Math.round(x)));
  const safeY = Math.min(window.innerHeight - 1, Math.max(1, Math.round(y)));

  return resolveElementBackground(document.elementFromPoint(safeX, safeY));
}

function toHex(color: RgbaColor): string {
  const segment = (value: number) => clampChannel(value).toString(16).padStart(2, '0');
  return `#${segment(color.r)}${segment(color.g)}${segment(color.b)}`;
}

function getRelativeLuminance(color: RgbaColor): number {
  const toLinear = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  return (
    0.2126 * toLinear(color.r) +
    0.7152 * toLinear(color.g) +
    0.0722 * toLinear(color.b)
  );
}

function updateThemeColor(color: string) {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = color;
}

function normalizeHexColor(value: string | null | undefined): string | null {
  const parsed = parseCssColor(value);
  return parsed ? toHex(parsed) : null;
}

function resolveTone(color: string, preferredTone?: SurfaceTone): SurfaceTone {
  if (preferredTone) {
    return preferredTone;
  }

  return getRelativeLuminance(parseCssColor(color) ?? OPAQUE_WHITE) >= LIGHT_SURFACE_THRESHOLD
    ? 'light'
    : 'dark';
}

function isVisibleHintElement(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || Number.parseFloat(style.opacity || '1') === 0) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function getLatestVisibleHint(selector: string): HTMLElement | null {
  const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));

  for (let index = elements.length - 1; index >= 0; index -= 1) {
    const element = elements[index];
    if (isVisibleHintElement(element)) {
      return element;
    }
  }

  return null;
}

function readToneHint(value: string | null | undefined): SurfaceTone | undefined {
  if (value === 'light' || value === 'dark') {
    return value;
  }

  return undefined;
}

function getExplicitSurfaceHint(): ExplicitSurfaceHint | null {
  const topHint =
    getLatestVisibleHint('[data-native-app-header][data-native-top-surface]') ??
    getLatestVisibleHint('[data-native-top-surface]');
  const bottomHint = getLatestVisibleHint('[data-native-bottom-surface]');
  const screenHint = getLatestVisibleHint('[data-native-screen-surface]');

  const statusBarColor =
    normalizeHexColor(topHint?.dataset.nativeTopSurface) ??
    normalizeHexColor(screenHint?.dataset.nativeTopSurface);
  const navigationBarColor =
    normalizeHexColor(bottomHint?.dataset.nativeBottomSurface) ??
    normalizeHexColor(screenHint?.dataset.nativeBottomSurface);
  const tone =
    readToneHint(topHint?.dataset.nativeTone) ??
    readToneHint(screenHint?.dataset.nativeTone);

  if (!statusBarColor && !navigationBarColor && !tone) {
    return null;
  }

  return {
    statusBarColor: statusBarColor ?? navigationBarColor ?? undefined,
    navigationBarColor: navigationBarColor ?? statusBarColor ?? undefined,
    tone,
  };
}

function getRoutePreset(pathname: string): ResolvedSystemBars | null {
  if (pathname === '/app') {
    return {
      statusBarColor: SPLASH_RUST,
      navigationBarColor: SPLASH_GLOW,
      statusBarTone: 'dark',
      navigationBarTone: 'dark',
    };
  }

  if (
    pathname.startsWith('/app/onboarding') ||
    pathname.startsWith('/app/permissions') ||
    pathname === '/app/signup-success'
  ) {
    const surface = getAppSurface();
    const isDark = document.documentElement.classList.contains('dark');
    const tone: SurfaceTone = isDark ? 'dark' : 'light';
    return {
      statusBarColor: surface,
      navigationBarColor: surface,
      statusBarTone: tone,
      navigationBarTone: tone,
    };
  }

  return null;
}

function resolveSystemBars(pathname: string): ResolvedSystemBars {
  const explicitHint = getExplicitSurfaceHint();
  if (explicitHint?.statusBarColor || explicitHint?.navigationBarColor) {
    const surface = getAppSurface();
    const statusBarColor = explicitHint.statusBarColor ?? explicitHint.navigationBarColor ?? surface;
    const navigationBarColor = explicitHint.navigationBarColor ?? explicitHint.statusBarColor ?? surface;

    return {
      statusBarColor,
      navigationBarColor,
      statusBarTone: resolveTone(statusBarColor, explicitHint.tone),
      navigationBarTone: resolveTone(navigationBarColor, explicitHint.tone),
    };
  }

  const preset = getRoutePreset(pathname);
  if (preset) {
    return preset;
  }

  const statusColor = sampleViewportColor(window.innerWidth / 2, TOP_PROBE_PADDING);
  const navigationColor = sampleViewportColor(
    window.innerWidth / 2,
    Math.max(TOP_PROBE_PADDING, window.innerHeight - BOTTOM_PROBE_OFFSET),
  );

  return {
    statusBarColor: toHex(statusColor),
    navigationBarColor: toHex(navigationColor),
    statusBarTone: getRelativeLuminance(statusColor) >= LIGHT_SURFACE_THRESHOLD ? 'light' : 'dark',
    navigationBarTone: getRelativeLuminance(navigationColor) >= LIGHT_SURFACE_THRESHOLD ? 'light' : 'dark',
  };
}

export function useNativeSystemBars() {
  const location = useLocation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return;
    }

    let frameId = 0;
    const timeoutIds: number[] = [];
    let cancelled = false;

    const syncSystemBars = async () => {
      const {
        statusBarColor,
        statusBarTone,
        navigationBarColor,
        navigationBarTone,
      } = resolveSystemBars(location.pathname);
      const statusBarStyle =
        statusBarTone === 'light' ? SystemBarsStyle.Light : SystemBarsStyle.Dark;
      const navigationBarStyle =
        navigationBarTone === 'light' ? SystemBarsStyle.Light : SystemBarsStyle.Dark;

      updateThemeColor(statusBarColor);

      try {
        await SystemBars.setStyle({
          bar: SystemBarType.StatusBar,
          style: statusBarStyle,
        });
      } catch {
        // Ignore unsupported environments while keeping the web app responsive.
      }

      try {
        await SystemBars.setStyle({
          bar: SystemBarType.NavigationBar,
          style: navigationBarStyle,
        });
      } catch {
        // Ignore unsupported environments while keeping the web app responsive.
      }

      if (!cancelled) {
        document.documentElement.style.setProperty('--android-status-bar-color', statusBarColor);
        document.documentElement.style.setProperty('--android-navigation-bar-color', navigationBarColor);
      }
    };

    const scheduleSync = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        void syncSystemBars();
      });
    };

    scheduleSync();
    for (const delay of [80, 240, 480]) {
      timeoutIds.push(window.setTimeout(scheduleSync, delay));
    }

    const observer = new MutationObserver(scheduleSync);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    });

    window.addEventListener('resize', scheduleSync, { passive: true });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
      for (const timeoutId of timeoutIds) {
        window.clearTimeout(timeoutId);
      }
      observer.disconnect();
      window.removeEventListener('resize', scheduleSync);
    };
  }, [location.pathname, location.search]);
}
