import { AppNav, HomeLink } from "@/components/app/app-nav";
import { Logo } from "@/components/logo";

export function AppHeader() {
  return (
    <header className="bg-background/80 border-border sticky top-0 z-40 w-full border-b backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <HomeLink>
          <Logo />
        </HomeLink>

        <AppNav />
      </div>
    </header>
  );
}
