import { loadHapticsPlugin } from '@/lib/nativePlugins';

export const useHaptics = () => {
  const vibrate = async (type: 'light' | 'medium' | 'heavy' = 'medium') => {
    try {
      const { Haptics, ImpactStyle } = await loadHapticsPlugin();
      const style = type === 'light'
        ? ImpactStyle.Light
        : type === 'heavy'
          ? ImpactStyle.Heavy
          : ImpactStyle.Medium;

      await Haptics.impact({ style });
    } catch (error) {
      // Haptics not available (web browser)
    }
  };

  const notificationSuccess = async () => {
    try {
      const { Haptics, NotificationType } = await loadHapticsPlugin();
      await Haptics.notification({ type: NotificationType.Success });
    } catch (error) {
      // Haptics not available
    }
  };

  const notificationWarning = async () => {
    try {
      const { Haptics, NotificationType } = await loadHapticsPlugin();
      await Haptics.notification({ type: NotificationType.Warning });
    } catch (error) {
      // Haptics not available
    }
  };

  const notificationError = async () => {
    try {
      const { Haptics, NotificationType } = await loadHapticsPlugin();
      await Haptics.notification({ type: NotificationType.Error });
    } catch (error) {
      // Haptics not available
    }
  };

  return {
    vibrate,
    notificationSuccess,
    notificationWarning,
    notificationError
  };
};
