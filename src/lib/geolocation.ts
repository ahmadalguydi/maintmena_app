import { toast } from "sonner";

export const checkLocation = async (targetLat: number, targetLng: number, maxDistanceMeters: number = 200): Promise<boolean> => {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            console.warn("Geolocation not supported");
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
                    toast.error(`You are ${Math.round(d)}m away. You must be within ${maxDistanceMeters}m to start the job.`);
                    resolve(false);
                } else {
                    resolve(true);
                }
            },
            (error) => {
                console.error("Geolocation error:", error);
                toast.error('Could not verify location. Assuming onsite (Dev/Error Mode).');
                resolve(true); // Allow in dev/error
            }
        );
    });
};
