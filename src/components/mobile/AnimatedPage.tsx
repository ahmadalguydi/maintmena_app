import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedPageProps {
    children: ReactNode;
    className?: string;
}

export const AnimatedPage = ({ children, className = "" }: AnimatedPageProps) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`min-h-[calc(100vh-80px)] w-full ${className}`}
        >
            {children}
        </motion.div>
    );
};
