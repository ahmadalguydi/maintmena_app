import { useRealtimeHub } from '@/hooks/useRealtimeHub';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export function RealtimeHub() {
    useRealtimeHub();
    usePushNotifications();
    return null;
}
