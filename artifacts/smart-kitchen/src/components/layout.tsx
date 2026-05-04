import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { ChefHat, Home, ListChecks, MessageSquare, Utensils, Sparkles } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/stock", label: "Pantry", icon: ListChecks },
    { href: "/recipes", label: "Recipes", icon: Utensils },
    { href: "/suggestions", label: "Ideas", icon: Sparkles },
    { href: "/shopping", label: "Shopping", icon: ListChecks },
    { href: "/chat", label: "Chef Chat", icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-sidebar border-r border-sidebar-border flex-shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
            <ChefHat className="w-5 h-5" />
          </div>
          <span className="font-serif font-bold text-xl text-sidebar-foreground">Sous-Chef</span>
        </div>
        
        <nav className="px-4 pb-6 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="p-6 md:p-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
