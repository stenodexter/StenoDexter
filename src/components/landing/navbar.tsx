import Image from "next/image";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Logo } from "../utils/logo";

export function Navbar() {
  return (
    <nav className="border-border bg-background/80 fixed top-0 z-50 w-full border-b backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href={"/"} className="flex items-center gap-2">
          <div className="flex h-10.5 w-10.5 items-center justify-center overflow-hidden rounded-sm bg-white shadow-sm">
            <Image
              src="/icon.png"
              alt="Logo"
              width={200}
              height={200}
              className="h-full w-full translate-y-0.5 scale-135 object-contain"
            />
          </div>

          <span>
            <Logo />
            <p className="text-muted-foreground text-xs font-semibold">
              SPEED. PRECISION. SUCCESS.
            </p>
          </span>
        </Link>

        <div className="hidden gap-8 md:flex">
          <Link
            href="/about-us"
            className="text-foreground/80 hover:text-foreground text-sm font-medium transition-colors"
          >
            About Us
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
            Contact Us
          </Link>

          <Link
            href="/demo"
            className="text-foreground/80 hover:text-foreground text-sm font-medium transition-colors"
          >
            Demo
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link href="/user/register">Register</Link>
          </Button>
          <Button
            asChild
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Link href="/user/login">Login</Link>
          </Button>
        </div>
      </div>
    </nav>
  );
}
