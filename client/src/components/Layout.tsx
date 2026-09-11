import { NavLink, Outlet } from "react-router-dom";
import DemoBanner from "./DemoBanner";
import { APP_TITLE, ASSISTANT_TITLE } from "@/lib/brand";

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: ASSISTANT_TITLE, end: true },
  { to: "/workbench", label: APP_TITLE },
];

const Layout = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background">
        <DemoBanner />
        <nav className="mx-auto flex w-full max-w-3xl items-center gap-6 px-5 md:px-8">
          {NAV_ITEMS.map((item: NavItem) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }): string =>
                `border-b-2 py-3 text-sm transition-colors ${
                  isActive
                    ? "border-primary font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-3xl px-5 py-8 md:px-8 md:py-12">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
