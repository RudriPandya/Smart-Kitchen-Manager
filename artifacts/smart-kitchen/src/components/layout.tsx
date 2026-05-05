import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { ChefHat, Home, Package, Utensils, Sparkles, ShoppingCart, MessageSquare, CalendarDays } from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/stock", label: "Pantry", icon: Package },
  { href: "/recipes", label: "Recipes", icon: Utensils },
  { href: "/suggestions", label: "Ideas", icon: Sparkles },
  { href: "/history", label: "History", icon: CalendarDays },
  { href: "/shopping", label: "Shopping", icon: ShoppingCart },
  { href: "/chat", label: "Chef Chat", icon: MessageSquare },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  function isActive(href: string) {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border flex-shrink-0 sticky top-0 h-screen">
        {/* Logo */}
        <div className="p-6 flex items-center gap-3 border-b border-sidebar-border/50">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <span className="font-serif font-bold text-lg text-sidebar-foreground leading-none block">Sous-Chef</span>
            <span className="text-xs text-sidebar-foreground/50">Kitchen Manager</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer group",
                isActive(item.href)
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )}>
                <item.icon className={cn(
                  "w-4 h-4 transition-transform group-hover:scale-110",
                  isActive(item.href) ? "text-primary-foreground" : "text-sidebar-foreground/60"
                )} />
                {item.label}
              </div>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-sidebar-border/50">
          <div className="px-3 py-2 rounded-lg bg-sidebar-accent/30 text-xs text-sidebar-foreground/50 text-center">
            AI-powered kitchen assistant
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Bar */}
        <header className="md:hidden sticky top-0 z-30 bg-sidebar border-b border-sidebar-border px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            <ChefHat className="w-4 h-4" />
          </div>
          <span className="font-serif font-bold text-lg text-sidebar-foreground">Sous-Chef</span>
        </header>

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="p-5 md:p-8 max-w-6xl mx-auto">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-sidebar border-t border-sidebar-border px-1 py-1.5 flex justify-around">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all min-w-[44px]",
                isActive(item.href)
                  ? "text-primary"
                  : "text-sidebar-foreground/50 hover:text-sidebar-foreground"
              )}>
                <item.icon className="w-5 h-5" />
                <span className="text-[9px] font-medium leading-none">{item.label}</span>
              </div>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
