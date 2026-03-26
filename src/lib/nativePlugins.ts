let capacitorCorePromise: Promise<typeof import('@capacitor/core')> | null = null;
let cameraPromise: Promise<typeof import('@capacitor/camera')> | null = null;
let geolocationPromise: Promise<typeof import('@capacitor/geolocation')> | null = null;
let pushNotificationsPromise: Promise<typeof import('@capacitor/push-notifications')> | null = null;
let hapticsPromise: Promise<typeof import('@capacitor/haptics')> | null = null;

export const loadCapacitorCore = () => {
  capacitorCorePromise ??= import('@capacitor/core');
  return capacitorCorePromise;
};

export const loadCameraPlugin = () => {
  cameraPromise ??= import('@capacitor/camera');
  return cameraPromise;
};

export const loadGeolocationPlugin = () => {
  geolocationPromise ??= import('@capacitor/geolocation');
  return geolocationPromise;
};

export const loadPushNotificationsPlugin = () => {
  pushNotificationsPromise ??= import('@capacitor/push-notifications');
  return pushNotificationsPromise;
};

export const loadHapticsPlugin = () => {
  hapticsPromise ??= import('@capacitor/haptics');
  return hapticsPromise;
};

export const isNativePlatform = async () => {
  try {
    const { Capacitor } = await loadCapacitorCore();
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};
