import { toast } from "sonner";

export const checkLocation = async (targetLat: number, targetLng: number, maxDistanceMeters: number = 200, language: 'en' | 'ar' = 'en'): Promise<boolean> => {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            if (import.meta.env.DEV) console.warn("Geolocation not supported");
            resolve(true); // Fallback if no GPS
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                // Haversine distance
                const R = 6371e3; // metres
                const φ1 = latitude * Math.PI / 180;
                const φ2 = targetLat * Math.PI / 180;
                const Δφ = (targetLat - latitude) * Math.PI / 180;
                const Δλ = (targetLng - longitude) * Math.PI / 180;

                const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                    Math.cos(φ1) * Math.cos(φ2) *
                    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const d = R * c; // in metres

                if (d > maxDistanceMeters) {
                    toast.error(
                        language === 'ar'
                            ? `أنت على بُعد ${Math.round(d)} م. يجب أن تكون ضمن ${maxDistanceMeters} م لبدء العمل.`
                            : `You are ${Math.round(d)}m away. You must be within ${maxDistanceMeters}m to start the job.`
                    );
                    resolve(false);
                } else {
                    resolve(true);
                }
            },
            (error) => {
                if (import.meta.env.DEV) console.error("Geolocation error:", error);
                toast.info(
                    language === 'ar'
                        ? 'تعذّر التحقق من موقعك — تأكد أنك في الموقع قبل البدء'
                        : 'Location unavailable — please ensure you are on-site before starting'
                );
                resolve(true); // Allow on error
            }
        );
    });
};
