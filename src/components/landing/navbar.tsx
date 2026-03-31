import Image from "next/image";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { ThemeToggle } from "../utils/theme-toggle";

export function Navbar() {
  return (
    <nav className="border-border bg-background/80 fixed top-0 z-50 w-full border-b backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href={"/"} className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-white shadow-sm">
            <Image
              src="/icon.png"
              alt="Logo"
              width={300}
              height={300}
              className="h-full w-full scale-135 object-cover"
            />
          </div>
          <span className="font-logo text-xl font-bold tracking-tight">
            STENO<span className="text-primary"> DEXTER</span>
          </span>
        </Link>

        <div className="hidden gap-8 md:flex">
          <Link
            href="/about-us"
            className="text-foreground/80 hover:text-foreground text-sm font-medium transition-colors"
          >
            About
          </Link>
          <Link
            href="/courses"
            className="text-foreground/80 hover:text-foreground text-sm font-medium transition-colors"
          >
            Courses
          </Link>
          <Link
            href="/hall-of-fame"
            className="text-foreground/80 hover:text-foreground text-sm font-medium transition-colors"
          >
            Hall of Fame
          </Link>
          <Link
            href="/contact-us"
            className="text-foreground/80 hover:text-foreground text-sm font-medium transition-colors"
          >
            Contact
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link href="/user/login">Sign In</Link>
          </Button>
          <ThemeToggle />
          <Button
            asChild
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Link href="/user">Get Started</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
