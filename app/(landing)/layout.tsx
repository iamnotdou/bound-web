import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Grid 2 | Tailark Quartz pages",
  description:
    "The grid-2 design system uses a distinctive grid paper aesthetic where content is laid out inside card-like cells separated by `0.5px` gaps, flanked by decorative side columns. Every visible section on the page is built from a small set of composable primitives.",
};

export default function LandingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      <main className="bg-background">
        <div className="bg-foreground/3">{children}</div>
      </main>
      <Footer />
    </>
  );
}
