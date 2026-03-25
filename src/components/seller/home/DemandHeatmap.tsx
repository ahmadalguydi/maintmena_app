import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface DemandHeatmapProps {
    currentLanguage: 'en' | 'ar';
}

export function DemandHeatmap({ currentLanguage }: DemandHeatmapProps) {
    // Simulate demand bubbles at different positions
    const demandBubbles = [
        { x: 25, y: 30, size: 80, opacity: 0.4, color: 'from-red-400/60 to-red-300/30' },
        { x: 65, y: 25, size: 60, opacity: 0.3, color: 'from-orange-400/50 to-orange-300/20' },
        { x: 45, y: 55, size: 50, opacity: 0.35, color: 'from-amber-400/50 to-amber-300/20' },
        { x: 75, y: 60, size: 70, opacity: 0.45, color: 'from-red-400/60 to-red-300/30' },
        { x: 30, y: 70, size: 40, opacity: 0.25, color: 'from-orange-400/40 to-orange-300/15' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative w-full h-36 bg-gradient-to-br from-amber-50 to-orange-50 overflow-hidden"
        >
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.3" className="text-amber-900" />
                    </pattern>
                    <rect width="100" height="100" fill="url(#grid)" />
                </svg>
            </div>

            {/* Demand bubbles */}
            {demandBubbles.map((bubble, index) => (
                <motion.div
                    key={index}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                        scale: [1, 1.05, 1],
                        opacity: bubble.opacity
                    }}
                    transition={{
                        delay: index * 0.1,
                        duration: 2,
                        repeat: Infinity,
                        repeatType: 'reverse',
                    }}
                    className={cn(
                        "absolute rounded-full bg-gradient-to-br blur-sm",
                        bubble.color
                    )}
                    style={{
                        left: `${bubble.x}%`,
                        top: `${bubble.y}%`,
                        width: bubble.size,
                        height: bubble.size,
                        transform: 'translate(-50%, -50%)',
                    }}
                />
            ))}

            {/* Your area marker */}
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className="absolute left-[20%] top-[50%] flex flex-col items-center -translate-x-1/2 -translate-y-1/2"
            >
                <div
                    className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-lg"
                />
                <span className={cn(
                    "mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                    currentLanguage === 'ar'
                        ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white"
                        : "bg-card border border-border/40 text-emerald-700"
                )}
                    style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
                >
                    {currentLanguage === 'ar' ? 'منطقتك' : 'Your area'}
                </span>
            </motion.div>
        </motion.div>
    );
}
