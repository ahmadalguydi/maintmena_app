import { ReactNode } from 'react';
import { useLocation, Routes } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from './PageTransition';

interface AnimatedRoutesProps {
    children: ReactNode;
}

/**
 * Wrapper component that provides AnimatePresence for route transitions.
 * 
 * Usage:
 * <AnimatedRoutes>
 *   <Routes location={location}>
 *     <Route path="/app/buyer/home" element={<BuyerHome />} />
 *     ...
 *   </Routes>
 * </AnimatedRoutes>
 */
export function AnimatedRoutes({ children }: AnimatedRoutesProps) {
    const location = useLocation();

    // Only animate /app routes (mobile app)
    const isAppRoute = location.pathname.startsWith('/app');

    if (!isAppRoute) {
        // No animation for web routes
        return <>{children}</>;
    }

    return (
        <AnimatePresence mode="wait" initial={false}>
            <PageTransition key={location.pathname}>
                {children}
            </PageTransition>
        </AnimatePresence>
    );
}
