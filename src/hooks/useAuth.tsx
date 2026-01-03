import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { identifyUser, trackSignup, trackLogin } from '@/lib/brevoAnalytics';

// Bilingual messages
const messages = {
  en: {
    accountCreated: 'Account created successfully!',
    signedIn: 'Signed in successfully!',
    signedOut: 'Signed out successfully',
    emailFailed: 'Account created but failed to send verification email. You can verify later in your profile.',
    tooManyAttempts: 'Too many login attempts. Please try again in 15 minutes.',
    unexpectedError: 'An unexpected error occurred',
    errorSigningOut: 'Error signing out'
  },
  ar: {
    accountCreated: 'تم إنشاء الحساب بنجاح!',
    signedIn: 'تم تسجيل الدخول بنجاح!',
    signedOut: 'تم تسجيل الخروج بنجاح',
    emailFailed: 'تم إنشاء الحساب لكن فشل إرسال رسالة التحقق. يمكنك التحقق لاحقاً من ملفك الشخصي.',
    tooManyAttempts: 'محاولات كثيرة جداً. يرجى المحاولة بعد ١٥ دقيقة.',
    unexpectedError: 'حدث خطأ غير متوقع',
    errorSigningOut: 'خطأ في تسجيل الخروج'
  }
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userType: 'buyer' | 'seller' | 'admin' | null;
  signUp: (email: string, password: string, fullName: string, userType: 'buyer' | 'seller', phone?: string, companyName?: string, buyerType?: 'company' | 'individual', language?: 'en' | 'ar') => Promise<{ error: any }>;
  signIn: (email: string, password: string, language?: 'en' | 'ar') => Promise<{ error: any }>;
  signOut: (language?: 'en' | 'ar') => Promise<void>;
  refreshUserType: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<'buyer' | 'seller' | 'admin' | null>(null);
  const navigate = useNavigate();

  const fetchUserType = async (userId: string): Promise<'buyer' | 'seller' | 'admin' | null> => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .in('role', ['buyer', 'buyer_individual', 'seller', 'admin'])
      .order('role', { ascending: true }); // Orders: admin, buyer, buyer_individual, seller

    if (error) {
      console.warn('fetchUserType:', error.message);
      setUserType(null);
      return null;
    }

    if (!data || data.length === 0) {
      setUserType(null);
      return null;
    }

    // Priority: admin > seller > buyer > buyer_individual
    const roles = data.map((r) => r.role);

    let determinedUserType: 'buyer' | 'seller' | 'admin' | null = null;

    if (roles.includes('admin')) {
      determinedUserType = 'admin';
    } else if (roles.includes('seller')) {
      determinedUserType = 'seller';
    } else if (roles.includes('buyer')) {
      determinedUserType = 'buyer';
    } else if (roles.includes('buyer_individual')) {
      determinedUserType = 'buyer'; // Map buyer_individual to buyer for UI purposes
    }

    setUserType(determinedUserType);
    return determinedUserType;
  };

  const refreshUserType = async () => {
    if (user) {
      await fetchUserType(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => fetchUserType(session.user.id), 0);
        } else {
          setUserType(null);
        }
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserType(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    userType: 'buyer' | 'seller',
    phone?: string,
    companyName?: string,
    buyerType?: 'company' | 'individual',
    language: 'en' | 'ar' = 'en'
  ) => {
    const t = messages[language];

    try {
      // Create user WITHOUT email redirect (we'll handle verification manually)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            user_type: userType,
            buyer_type: buyerType || null,
            phone: phone || null,
            company_name: companyName || null
          }
          // Removed emailRedirectTo - we handle verification ourselves
        }
      });

      if (authError) {
        toast.error(authError.message);
        return { error: authError };
      }

      if (authData.user) {
        // Send custom verification email via our edge function (non-blocking)
        supabase.functions.invoke('send-verification-email', {
          body: {
            userId: authData.user.id,
            email: email,
            fullName: fullName,
            userType: userType,
            language: language
          }
        }).then(({ error: emailError }) => {
          if (emailError) {
            console.error('Failed to send verification email:', emailError);
            // Don't block signup, just log the error
          }
        });

        // Track signup in Brevo and identify user with additional attributes
        trackSignup(email, userType, language);
        identifyUser(email, {
          userType: userType,
          language: language,
          companyName: companyName || undefined,
          firstName: fullName.split(' ')[0] || fullName,
          lastName: fullName.split(' ').slice(1).join(' ') || undefined
        });

        // Check if session was created - if not, email confirmation is likely required
        if (!authData.session) {
          toast.warning(language === 'ar' ? 'يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب' : 'Please check your email to verify your account');
          // Start manual verification flow if desired, but for now just warn
        } else {
          toast.success(t.accountCreated);
        }
      }

      return { error: null };
    } catch (error: any) {
      toast.error(t.unexpectedError);
      return { error };
    }
  };

  const signIn = async (email: string, password: string, language: 'en' | 'ar' = 'en') => {
    const t = messages[language];

    try {
      // Check rate limit before attempting login
      /* 
      const { data: canProceed } = await supabase.rpc('check_rate_limit', {
        p_user_id: null, // null for IP-based rate limiting
        p_action: 'login_attempt',
        p_max_attempts: 5,
        p_window_minutes: 15
      });

      if (!canProceed) {
        const error = { message: t.tooManyAttempts };
        toast.error(error.message);
        return { error };
      }
      */

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Handle specific error for email not confirmed
        if (error.message.includes("Email not confirmed")) {
          toast.error(language === 'ar' ? 'البريد الإلكتروني غير مفعل. يرجى التحقق من صندوق الوارد.' : 'Email not confirmed. Please check your inbox.');
        } else {
          toast.error(error.message);
        }
        return { error };
      }

      // Fetch user type on sign in and get the actual type
      if (data.user) {
        const actualUserType = await fetchUserType(data.user.id);

        // Track login and identify user in Brevo with the fetched user type
        if (data.user.email && actualUserType) {
          trackLogin(data.user.email);
          identifyUser(data.user.email, {
            userType: actualUserType,
            language: language
          });
        }
      }

      toast.success(t.signedIn);
      return { error: null };
    } catch (error: any) {
      toast.error(t.unexpectedError);
      return { error };
    }
  };

  const signOut = async (language: 'en' | 'ar' = 'en') => {
    const t = messages[language];

    try {
      // Then call Supabase signOut
      await supabase.auth.signOut();

      // Clear state after signOut
      setUser(null);
      setSession(null);
      setUserType(null);

      toast.success(t.signedOut);

      // Check if user is in mobile app context
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/app')) {
        navigate('/app/onboarding/login', { replace: true });
      } else {
        navigate('/logout', { replace: true });
      }
    } catch (error) {
      toast.error(t.errorSigningOut);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, userType, signUp, signIn, signOut, refreshUserType }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};