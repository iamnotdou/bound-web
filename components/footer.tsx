import { Logo } from "@/components/logo";
import Link from "next/link";
import { Container, Separator } from "@/components/container";

const links = [
  {
    group: "Product",
    items: [
      {
        title: "Docs",
        href: "/docs",
      },
      {
        title: "SDK",
        href: "/docs",
      },
      {
        title: "CLI",
        href: "/docs",
      },
      {
        title: "MCP Server",
        href: "/docs",
      },
    ],
  },
  {
    group: "Company",
    items: [
      {
        title: "App",
        href: "/app",
      },
      {
        title: "Blog — coming soon",
        href: "/blog",
      },
      {
        title: "Contact",
        href: "/contact",
      },
    ],
  },
];

export function Footer() {
  return (
    <footer role="contentinfo" className="bg-foreground/3">
      <Container>
        <div className="h-12"></div>
      </Container>

      <Container asGrid>
        <div className="@4xl:grid-cols-5 grid gap-px">
          <div
            data-grid-content
            className="@4xl:col-span-2 space-y-6 p-6 lg:p-12"
          >
            <Link href="/" aria-label="go home" className="block size-fit">
              <Logo />
            </Link>

            <p className="text-muted-foreground text-balance">
              A surety bond for AI agents, on-chain. Know your worst case before
              you transact.
            </p>
          </div>

          <div className="@4xl:col-span-3 grid gap-px sm:grid-cols-3">
            {links.map((link, index) => (
              <div
                key={index}
                data-grid-content
                className="space-y-4 p-6 text-sm lg:p-12"
              >
                <span className="block font-medium">{link.group}</span>

                <div className="flex flex-wrap gap-4 sm:flex-col">
                  {link.items.map((item, index) => (
                    <Link
                      key={index}
                      href={item.href}
                      className="text-muted-foreground hover:text-primary block duration-150"
                    >
                      <span>{item.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            <div data-grid-content className="space-y-4 p-6 lg:p-12">
              <span className="block font-medium">Community</span>
              <div className="flex flex-wrap gap-3 text-sm">
                <Link
                  href="https://x.com/iamnotdou"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="X/Twitter"
                  className="text-muted-foreground hover:text-primary block"
                >
                  <svg
                    className="size-5"
                    xmlns="http://www.w3.org/2000/svg"
                    width="1em"
                    height="1em"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="currentColor"
                      d="M10.488 14.651L15.25 21h7l-7.858-10.478L20.93 3h-2.65l-5.117 5.886L8.75 3h-7l7.51 10.015L2.32 21h2.65zM16.25 19L5.75 5h2l10.5 14z"
                    ></path>
                  </svg>
                </Link>
                <Link
                  href="https://github.com/iamnotdou/bound"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                  className="text-muted-foreground hover:text-primary block"
                >
                  <svg
                    className="size-5"
                    xmlns="http://www.w3.org/2000/svg"
                    width="1em"
                    height="1em"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="currentColor"
                      d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2"
                    ></path>
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div
            data-grid-content
            className="flex flex-wrap items-center justify-between gap-4 p-6 lg:px-12"
          >
            <span className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} Bound, All rights reserved{" "}
            </span>

            <div className="ring-foreground/5 bg-card flex items-center gap-2 rounded-full border border-transparent py-1 pl-2 pr-4 shadow ring-1">
              <div className="relative flex size-3">
                <span className="duration-1500 absolute inset-0 block size-full animate-pulse rounded-full bg-emerald-100"></span>
                <span className="relative m-auto block size-1 rounded-full bg-emerald-500"></span>
              </div>
              <span className="text-sm">All Systems Normal</span>
            </div>
          </div>
        </div>
      </Container>

      <Separator className="h-6" />
      <Separator className="h-12" />
    </footer>
  );
}
