import Image from "next/image";
import Link from "next/link";
import { Logo } from "../utils/logo";

export function Footer() {
  return (
    <footer className="border-border bg-card border-t">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="text-foreground flex items-center gap-2 font-bold">
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-sm bg-white shadow-sm">
                <Image
                  src="/icon.png"
                  alt="Logo"
                  width={200}
                  height={200}
                  className="h-full w-full translate-y-0.5 scale-135 object-contain"
                />
              </div>
              <Logo size="sm"/>
            </div>
            <p className="text-foreground/70 mt-3 text-sm">
              Master stenography with our innovative platform and expert
              guidance.
            </p>
          </div>

          <div>
            <h4 className="text-foreground font-semibold">Product</h4>
            <ul className="mt-4 space-y-2">
              <li>
                <Link
                  href="#courses"
                  className="text-foreground/70 hover:text-primary text-sm"
                >
                  Courses
                </Link>
              </li>
              <li>
                <Link
                  href="#features"
                  className="text-foreground/70 hover:text-primary text-sm"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="#pricing"
                  className="text-foreground/70 hover:text-primary text-sm"
                >
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-foreground font-semibold">Company</h4>
            <ul className="mt-4 space-y-2">
              <li>
                <Link
                  href="/about-us"
                  className="text-foreground/70 hover:text-primary text-sm"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/contact-us"
                  className="text-foreground/70 hover:text-primary text-sm"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="/admin"
                  className="text-foreground/70 hover:text-primary text-sm"
                >
                  Admin
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-foreground font-semibold">Legal</h4>
            <ul className="mt-4 space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-foreground/70 hover:text-primary text-sm"
                >
                  Privacy
                </Link>
              </li>
              <li>
                <Link
                  href="/"
                  className="text-foreground/70 hover:text-primary text-sm"
                >
                  Terms
                </Link>
              </li>
              <li>
                <Link
                  href="/"
                  className="text-foreground/70 hover:text-primary text-sm"
                >
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-border mt-8 border-t pt-8">
          <p className="text-foreground/60 text-center text-sm">
            © 2026 Steno Dexter. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
