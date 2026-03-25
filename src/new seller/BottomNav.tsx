import { Home, Wallet, MessageCircle, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { key: "home", label: "Home", icon: Home, path: "/" },
  { key: "wallet", label: "Wallet", icon: Wallet, path: "/wallet" },
  { key: "messages", label: "Messages", icon: MessageCircle, path: "/notifications" },
  { key: "profile", label: "Profile", icon: User, path: "/profile" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card" style={{ boxShadow: "var(--shadow-nav)" }}>
      <div className="mx-auto flex max-w-md items-center justify-around py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.key}
              onClick={() => navigate(tab.path)}
              className="relative flex flex-col items-center gap-1 px-4 py-1 transition-colors"
            >
              <tab.icon
                className={`h-6 w-6 transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
                strokeWidth={active ? 2.2 : 1.8}
              />
              <span
                className={`text-[10px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {tab.label}
              </span>
              {/* Active dot indicator */}
              {active && (
                <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
