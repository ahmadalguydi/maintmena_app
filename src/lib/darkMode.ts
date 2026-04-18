/** Returns the app surface color based on current dark mode state */
export function getAppSurface(): string {
  return document.documentElement.classList.contains('dark') ? '#121212' : '#ffffff';
}

/** Returns whether dark mode is currently active */
export function isDarkMode(): boolean {
  return document.documentElement.classList.contains('dark');
}
