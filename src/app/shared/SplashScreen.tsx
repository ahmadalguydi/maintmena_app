import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';

export const SplashScreen = () => {
  const navigate = useNavigate();
  const { user, userType, loading } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loading) {
        if (user && userType) {
          // Already logged in, skip onboarding
          if (userType === 'seller') {
            navigate('/app/seller/home');
          } else {
            navigate('/app/buyer/home');
          }
        } else {
          // Not logged in, proceed to role selection
          navigate('/app/onboarding/role-selection');
        }
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigate, loading, user, userType]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-accent to-primary/80">
      <div className="text-center px-6">
        <motion.h1
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-5xl font-bold text-white mb-4"
        >
          MaintMENA
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-white/90 text-2xl font-ar-display"
          dir="rtl"
        >
          كل الفنيين في مكان واحد
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="mt-8"
        >
          <div className="w-16 h-1 bg-white/30 mx-auto rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ delay: 1.2, duration: 1.3 }}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};
