import { NavLink, Outlet } from "react-router-dom";
import { APP_TITLE, ASSISTANT_TITLE, WRITEUP_URL } from "@/lib/brand";

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
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background">
        <nav className="mx-auto flex w-full max-w-6xl items-center gap-6 px-5 md:px-8">
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
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 md:px-8 md:py-12">
        <Outlet />
      </main>
      <footer
        role="note"
        className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-5 py-3 text-xs text-muted-foreground md:px-8"
      >
        <span>Portfolio demo · template values withheld · AI features simulated</span>
        <a
          href={WRITEUP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          How it was built →
        </a>
      </footer>
    </div>
  );
};

export default Layout;
