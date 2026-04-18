export const MAPBOX_TOKEN =
  import.meta.env.VITE_MAPBOX_TOKEN || '';

export const MAPBOX_STREET_STYLE = 'mapbox://styles/mapbox/streets-v12';
export const MAPBOX_DARK_STYLE = 'mapbox://styles/mapbox/dark-v11';

export function getMapStyle(): string {
  return document.documentElement.classList.contains('dark')
    ? MAPBOX_DARK_STYLE
    : MAPBOX_STREET_STYLE;
}

export function getStaticMapStylePath(): string {
  const style = document.documentElement.classList.contains('dark')
    ? MAPBOX_DARK_STYLE
    : MAPBOX_STREET_STYLE;
  return style.replace('mapbox://styles/', '');
}
