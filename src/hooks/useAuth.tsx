import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { identifyUser, trackSignup, trackLogin } from "@/lib/brevoAnalytics";
import { unregisterPushNotifications } from "@/lib/pushNotifications";
import { clearPreferences } from "@/lib/preferences";

// Bilingual messages
const messages = {
  en: {
    accountCreated: "Account created successfully!",
    signedIn: "Signed in successfully!",
    signedOut: "Signed out successfully",
    emailFailed:
      "Account created but failed to send verification email. You can verify later in your profile.",
    tooManyAttempts: "Too many login attempts. Please try again in 15 minutes.",
    unexpectedError: "An unexpected error occurred",
    errorSigningOut: "Error signing out",
  },
  ar: {
    accountCreated: "تم إنشاء الحساب بنجاح!",
    signedIn: "تم تسجيل الدخول بنجاح!",
    signedOut: "تم تسجيل الخروج بنجاح",
    emailFailed:
      "تم إنشاء الحساب لكن فشل إرسال رسالة التحقق. يمكنك التحقق لاحقاً من ملفك الشخصي.",
    tooManyAttempts: "محاولات كثيرة جداً. يرجى المحاولة بعد ١٥ دقيقة.",
    unexpectedError: "حدث خطأ غير متوقع",
    errorSigningOut: "خطأ في تسجيل الخروج",
  },
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userType: "buyer" | "seller" | "admin" | null;
  userTypeLoaded: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    userType: "buyer" | "seller",
    phone?: string,
    companyName?: string,
    buyerType?: "company" | "individual",
    language?: "en" | "ar",
  ) => Promise<{ error: Error | null }>;
  signIn: (
    email: string,
    password: string,
    language?: "en" | "ar",
  ) => Promise<{ error: Error | null }>;
  signOut: (language?: "en" | "ar") => Promise<void>;
  refreshUserType: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const determinePrimaryRole = (
  roles: string[],
): "buyer" | "seller" | "admin" | null => {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("seller")) return "seller";
  if (roles.includes("buyer")) return "buyer";
  if (roles.includes("buyer_individual")) return "buyer";
  return null;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<"buyer" | "seller" | "admin" | null>(
    null,
  );
  const [userTypeLoaded, setUserTypeLoaded] = useState(false);
  const navigate = useNavigate();
  const authResolutionRef = useRef(0);
  const currentUserIdRef = useRef<string | null>(null);
  const loginAttemptsRef = useRef<{ count: number; firstAttemptAt: number }>({ count: 0, firstAttemptAt: 0 });

  const fetchUserType = useCallback(async (
    userId: string,
    retries = 3,
  ): Promise<"buyer" | "seller" | "admin" | null> => {
    let attempt = 0;
    while (attempt < retries) {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .in("role", ["buyer", "buyer_individual", "seller", "admin"])
        .order("role", { ascending: true }); // Orders: admin, buyer, buyer_individual, seller

      if (error) {
        if (import.meta.env.DEV) console.warn("fetchUserType:", error.message);
        return null;
      }

      if (data && data.length > 0) {
        const roles = data.map((r) => r.role);
        return determinePrimaryRole(roles);
      }

      attempt++;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return null;
  }, []);

  const resolveAndSetUserType = useCallback(async (userId: string) => {
    const resolutionId = ++authResolutionRef.current;
    const resolvedUserType = await fetchUserType(userId);

    if (
      currentUserIdRef.current !== userId ||
      authResolutionRef.current !== resolutionId
    ) {
      return resolvedUserType;
    }

    setUserType(resolvedUserType);
    setUserTypeLoaded(true);
    return resolvedUserType;
  }, [fetchUserType]);

  const refreshUserType = async () => {
    if (user) {
      await resolveAndSetUserType(user.id);
    }
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      currentUserIdRef.current = session?.user?.id ?? null;

      if (session?.user) {
        void resolveAndSetUserType(session.user.id);
      } else {
        authResolutionRef.current += 1;
        setUserType(null);
        setUserTypeLoaded(true);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      currentUserIdRef.current = session?.user?.id ?? null;

      if (session?.user) {
        void resolveAndSetUserType(session.user.id);
      } else {
        setUserTypeLoaded(true);
      }
      setLoading(false);
    }).catch(() => {
      setUserTypeLoaded(true);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [resolveAndSetUserType]);

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    userType: "buyer" | "seller",
    phone?: string,
    companyName?: string,
    buyerType?: "company" | "individual",
    language: "en" | "ar" = "en",
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
            company_name: companyName || null,
          },
          // Removed emailRedirectTo - we handle verification ourselves
        },
      });

      if (authError) {
        toast.error(authError.message);
        return { error: authError };
      }

      if (authData.user) {
        // Send custom verification email via our edge function (non-blocking)
        supabase.functions
          .invoke("send-verification-email", {
            body: {
              userId: authData.user.id,
              email: email,
              fullName: fullName,
              userType: userType,
              language: language,
            },
          })
          .then(({ error: emailError }) => {
            if (emailError) {
              if (import.meta.env.DEV) console.error("Failed to send verification email:", emailError);
              // Don't block signup, just log the error
            }
          })
          .catch((err) => {
            if (import.meta.env.DEV) console.error("Verification email request failed:", err);
          });

        // Track signup in Brevo and identify user with additional attributes
        trackSignup(email, userType, language);
        identifyUser(email, {
          userType: userType,
          language: language,
          companyName: companyName || undefined,
          firstName: fullName.split(" ")[0] || fullName,
          lastName: fullName.split(" ").slice(1).join(" ") || undefined,
        });

        // Check if session was created - if not, email confirmation is likely required
        if (!authData.session) {
          toast.warning(
            language === "ar"
              ? "يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب"
              : "Please check your email to verify your account",
          );
          // Start manual verification flow if desired, but for now just warn
        } else {
          toast.success(t.accountCreated);
        }
      }

      return { error: null };
    } catch (error) {
      toast.error(t.unexpectedError);
      return { error: error instanceof Error ? error : new Error(String(error)) };
    }
  };

  const signIn = async (
    email: string,
    password: string,
    language: "en" | "ar" = "en",
  ) => {
    const t = messages[language];

    try {
      // Client-side rate limiting: max 5 attempts per 15 minutes
      const now = Date.now();
      const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
      const MAX_ATTEMPTS = 5;
      if (loginAttemptsRef.current.count >= MAX_ATTEMPTS &&
          now - loginAttemptsRef.current.firstAttemptAt < RATE_LIMIT_WINDOW_MS) {
        const error = { message: t.tooManyAttempts };
        toast.error(error.message);
        return { error };
      }
      if (now - loginAttemptsRef.current.firstAttemptAt >= RATE_LIMIT_WINDOW_MS) {
        loginAttemptsRef.current = { count: 0, firstAttemptAt: now };
      }
      loginAttemptsRef.current.count += 1;
      if (loginAttemptsRef.current.count === 1) {
        loginAttemptsRef.current.firstAttemptAt = now;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Handle specific error for email not confirmed
        if (error.message.includes("Email not confirmed")) {
          toast.error(
            language === "ar"
              ? "البريد الإلكتروني غير مفعل. يرجى التحقق من صندوق الوارد."
              : "Email not confirmed. Please check your inbox.",
          );
        } else if (error.message.toLowerCase().includes('rate limit') || error.message.toLowerCase().includes('too many')) {
          toast.error(t.tooManyAttempts);
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
            language: language,
          });
        }
      }

      toast.success(t.signedIn);
      return { error: null };
    } catch (error) {
      toast.error(t.unexpectedError);
      return { error: error instanceof Error ? error : new Error(String(error)) };
    }
  };

  const signOut = async (language: "en" | "ar" = "en") => {
    const t = messages[language];

    try {
      await unregisterPushNotifications();

      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }

      authResolutionRef.current += 1;
      currentUserIdRef.current = null;
      setUser(null);
      setSession(null);
      setUserType(null);

      // Clear persisted user preferences to prevent data leaking to next login
      try {
        clearPreferences();
        localStorage.removeItem('selectedRole');
        localStorage.removeItem('intendedRole');
        localStorage.removeItem('preferredRole');
        localStorage.removeItem('pendingAction');
      } catch {
        // localStorage may be unavailable (Safari private browsing)
      }

      toast.success(t.signedOut);

      // Check if user is in mobile app context
      const currentPath = window.location.pathname;
      if (currentPath.startsWith("/app")) {
        navigate("/app/onboarding/login", { replace: true });
      } else {
        navigate("/logout", { replace: true });
      }
    } catch (error) {
      toast.error(t.errorSigningOut);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        userType,
        userTypeLoaded,
        signUp,
        signIn,
        signOut,
        refreshUserType,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
