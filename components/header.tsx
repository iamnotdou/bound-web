"use client";
import Link from "next/link";
import { Logo } from "@/components/logo";
import React from "react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  Menu,
  X,
  ArrowRight,
  Braces,
  SquareTerminal,
  Plug,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { Container, Separator } from "@/components/container";
import { buttonVariants } from "@/components/ui/button";
interface FeatureLink {
  href: string;
  name: string;
  description?: string;
  icon?: LucideIcon;
}

interface MobileLink {
  groupName?: string;
  links?: FeatureLink[];
  name?: string;
  href?: string;
}
const features: FeatureLink[] = [
  {
    href: "/docs",
    name: "SDK",
    description: "Check and enforce bonds from your code",
    icon: Braces,
  },
  {
    href: "/docs",
    name: "CLI",
    description: "Issue and inspect bonds from the terminal",
    icon: SquareTerminal,
  },
  {
    href: "/docs",
    name: "MCP Server",
    description: "Let agents verify bonds natively",
    icon: Plug,
  },
  {
    href: "/docs",
    name: "Docs",
    description: "Guides, references and examples",
    icon: BookOpen,
  },
];

const moreFeatures: FeatureLink[] = [
  {
    href: "/#features",
    name: "Bonds",
    description: "Pre-funded, on-chain worst-case coverage",
  },
  {
    href: "/#registry",
    name: "Registry",
    description: "Look up any bonded agent",
  },
  {
    href: "/#integrations",
    name: "Integrations",
    description: "Works with your agent stack",
  },
  {
    href: "/#enterprise",
    name: "Enterprise",
    description: "Fleet bonding and custom coverage",
  },
];

const mobileLinks: MobileLink[] = [
  {
    groupName: "Product",
    links: features,
  },
  { name: "Docs", href: "/docs" },
  { name: "Contact", href: "/contact" },
];

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  React.useEffect(() => {
    const originalOverflow = document.body.style.overflow;

    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <div aria-hidden className="bg-foreground/3">
        <Separator className="h-6" />
      </div>
      <header
        role="banner"
        data-state={isMobileMenuOpen ? "active" : "inactive"}
        {...(isScrolled && { "data-scrolled": true })}
        className="lg:data-scrolled:pb-[0.5px] bg-foreground/3 sticky inset-x-0 top-0 z-50 max-lg:pb-px"
      >
        <div
          className={cn(
            "w-full max-lg:h-14 max-lg:overflow-hidden",
            isMobileMenuOpen &&
              "max-lg:h-screen! max-lg:overflow-visible! bg-background/75 backdrop-blur",
          )}
        >
          <Container className="backdrop-blur">
            <div className="relative flex flex-wrap items-center justify-between px-6 lg:px-12 lg:py-5">
              <div className="z-51 relative flex justify-between gap-8 max-lg:h-14 max-lg:w-full">
                <Link
                  href="/"
                  aria-label="home"
                  className="flex items-center space-x-2"
                >
                  <Logo />
                </Link>

                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  aria-label={
                    isMobileMenuOpen == true ? "Close Menu" : "Open Menu"
                  }
                  className="relative z-20 -m-2.5 -mr-3 block cursor-pointer p-2.5 lg:hidden"
                >
                  <Menu className="in-data-[state=active]:rotate-180 in-data-[state=active]:scale-0 in-data-[state=active]:opacity-0 m-auto size-5 duration-200" />
                  <X className="in-data-[state=active]:rotate-0 in-data-[state=active]:scale-100 in-data-[state=active]:opacity-100 absolute inset-0 m-auto size-5 -rotate-180 scale-0 opacity-0 duration-200" />
                </button>
              </div>

              <div className="absolute inset-0 m-auto size-fit max-lg:hidden">
                <NavMenu />
              </div>
              {isMobileMenuOpen && (
                <div className="w-full lg:hidden">
                  <MobileMenu closeMenu={() => setIsMobileMenuOpen(false)} />
                </div>
              )}

              <div className="z-51 max-lg:in-data-[state=active]:mt-6 in-data-[state=active]:flex relative mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent">
                <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                  <Link
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                    })}
                    href="https://github.com/iamnotdou/bound"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <svg
                      className="size-4"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      aria-hidden
                    >
                      <path
                        fill="currentColor"
                        d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2"
                      />
                    </svg>
                    <span>GitHub</span>
                  </Link>
                  <Link className={buttonVariants({ size: "sm" })} href="/app">
                    <span>App</span>
                  </Link>
                </div>
              </div>
            </div>
          </Container>
        </div>
      </header>
    </>
  );
}

const MobileMenu = ({ closeMenu }: { closeMenu: () => void }) => {
  return (
    <nav
      role="navigation"
      className="w-full [--color-muted:--alpha(var(--color-foreground)/5%)]"
    >
      <Accordion
        type="single"
        collapsible
        className="**:hover:no-underline -mx-4 mt-0.5 space-y-0.5"
      >
        {mobileLinks.map((link, index) => {
          if (link.groupName && link.links) {
            return (
              <AccordionItem
                key={index}
                value={link.groupName}
                className="group relative border-b-0"
              >
                <AccordionTrigger className="**:font-normal! data-[state=open]:bg-muted flex items-center justify-between px-4 py-3 text-lg">
                  {link.groupName}
                </AccordionTrigger>
                <AccordionContent className="pb-5">
                  <ul>
                    {link.links.map((feature, featureIndex) => (
                      <li key={featureIndex}>
                        <Link
                          href={feature.href}
                          onClick={closeMenu}
                          className="block gap-2.5 px-4 py-3 text-lg"
                        >
                          {feature.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            );
          }
          return null;
        })}
      </Accordion>
      {mobileLinks.map((link, index) => {
        if (link.name && link.href) {
          return (
            <Link
              key={index}
              href={link.href}
              onClick={closeMenu}
              className="group relative block py-4 text-lg"
            >
              {link.name}
            </Link>
          );
        }
        return null;
      })}
    </nav>
  );
};

const NavMenu = () => {
  return (
    <NavigationMenu className="**:data-[slot=navigation-menu-link]:relative **:data-[slot=navigation-menu-link]:z-51 **:data-[slot=navigation-menu-trigger]:relative **:data-[slot=navigation-menu-trigger]:z-51 **:data-[slot=navigation-menu-viewport]:min-w-276 [--color-muted:color-mix(in_oklch,var(--color-foreground)_5%,transparent)] [--viewport-outer-px:2rem] max-lg:hidden">
      <NavigationMenuList className="gap-3">
        <NavigationMenuItem value="product">
          <NavigationMenuTrigger>Product</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="grid w-full grid-cols-4 gap-2">
              <div className="grid gap-2">
                <span className="text-muted-foreground ml-3 block border-b pb-3 text-sm">
                  Features
                </span>
                <ul>
                  {features.map((feature, index) => (
                    <ListItem
                      key={index}
                      href={feature.href}
                      title={feature.name}
                      description={feature.description}
                      icon={feature.icon}
                    />
                  ))}
                </ul>
              </div>
              <div className="col-span-2 gap-2">
                <span className="text-muted-foreground mb-3 ml-3 block border-b pb-3 text-sm">
                  More Features
                </span>
                <ul className="grid grid-cols-2">
                  {moreFeatures.map((feature, index) => (
                    <ListItem
                      key={index}
                      href={feature.href}
                      title={feature.name}
                      description={feature.description}
                    />
                  ))}
                </ul>
              </div>
            </div>
            <div className="relative m-3 grid grid-cols-[auto_1fr] items-center gap-3 border-t pt-6">
              <div className="bg-linear-to-b inset-ring-foreground/10 inset-ring-1 relative h-fit overflow-hidden rounded-xl from-red-300 to-purple-300 px-1 pb-1 transition-colors duration-200 hover:bg-emerald-50">
                <div className="mask-b-from-25% before:bg-background before:ring-foreground/10 after:ring-foreground/5 after:bg-background/75 before:z-1 before:inset-x-4.5 group relative -mx-4 px-4 pt-3 before:absolute before:bottom-3 before:top-2 before:rounded-t-md before:border before:border-transparent before:opacity-90 before:ring-1 after:absolute after:inset-x-5 after:bottom-2 after:top-1 after:rounded-t-md after:border after:border-transparent after:ring-1">
                  <div className="bg-card ring-foreground/10 relative z-10 h-10 w-12 overflow-hidden rounded-b-lg rounded-t-md border border-transparent text-sm shadow-xl shadow-black/10 ring" />
                </div>
              </div>
              <div className="space-y-0.5">
                <Link
                  href="https://github.com/iamnotdou/bound"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium before:absolute before:inset-0"
                >
                  Open Source
                </Link>

                <p className="text-foreground/60 line-clamp-1 text-sm">
                  Bound is built in public — read the code, open issues, and
                  contribute on GitHub.
                </p>
              </div>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem value="docs">
          <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
            <Link href="/docs">Docs</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem value="contact">
          <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
            <Link href="/contact">Contact</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
};

function ListItem({
  title,
  description,
  href,
  icon: Icon,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & {
  href: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
}) {
  return (
    <li {...props}>
      <NavigationMenuLink asChild className="group rounded-xl p-3">
        <Link href={href} className="grid grid-cols-[auto_1fr] gap-3.5">
          {Icon && (
            <div className="bg-card ring-foreground/10 flex size-9 items-center justify-center rounded-lg shadow-sm ring-1">
              <Icon className="text-muted-foreground size-4" />
            </div>
          )}
          <div className="space-y-1">
            <div className="text-foreground flex items-center gap-2 text-sm font-medium">
              {title}
              <ArrowRight
                strokeWidth={2.5}
                className="not-group-hover:opacity-0 not-group-hover:-translate-x-1 size-3 duration-200"
              />
            </div>
            <p className="text-muted-foreground line-clamp-1 text-sm">
              {description}
            </p>
          </div>
        </Link>
      </NavigationMenuLink>
    </li>
  );
}
