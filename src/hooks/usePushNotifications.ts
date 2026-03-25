
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const usePushNotifications = () => {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isSupported, setIsSupported] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) {
            setIsSupported(true);
            setPermission(Notification.permission);

            // Register SW if not already
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('SW Registered:', reg))
                .catch(err => console.error('SW Error:', err));
        }
    }, []);

    const requestPermission = async () => {
        if (!isSupported) {
            toast({
                title: 'Not Supported',
                description: 'Push notifications are not supported on this device.',
                variant: 'destructive',
            });
            return false;
        }

        try {
            const result = await Notification.requestPermission();
            setPermission(result);

            if (result === 'granted') {
                const reg = await navigator.serviceWorker.ready;
                // In a real implementation with VAPID:
                // const sub = await reg.pushManager.subscribe({ ... });
                // await supabase.from('push_subscriptions').insert(...)

                toast({
                    title: 'Notifications Enabled',
                    description: 'You will now receive updates.',
                });
                return true;
            }
        } catch (error) {
            console.error('Permission error:', error);
        }
        return false;
    };

    return {
        permission,
        isSupported,
        requestPermission
    };
};
