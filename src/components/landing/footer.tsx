import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 font-bold text-foreground">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground text-sm">
                SD
              </div>
              <span>Steno Dexter</span>
            </div>
            <p className="mt-3 text-sm text-foreground/70">
              Master stenography with our innovative platform and expert guidance.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground">Product</h4>
            <ul className="mt-4 space-y-2">
              <li>
                <Link
                  href="#courses"
                  className="text-sm text-foreground/70 hover:text-primary"
                >
                  Courses
                </Link>
              </li>
              <li>
                <Link
                  href="#features"
                  className="text-sm text-foreground/70 hover:text-primary"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="#pricing"
                  className="text-sm text-foreground/70 hover:text-primary"
                >
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground">Company</h4>
            <ul className="mt-4 space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-sm text-foreground/70 hover:text-primary"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/"
                  className="text-sm text-foreground/70 hover:text-primary"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="/"
                  className="text-sm text-foreground/70 hover:text-primary"
                >
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground">Legal</h4>
            <ul className="mt-4 space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-sm text-foreground/70 hover:text-primary"
                >
                  Privacy
                </Link>
              </li>
              <li>
                <Link
                  href="/"
                  className="text-sm text-foreground/70 hover:text-primary"
                >
                  Terms
                </Link>
              </li>
              <li>
                <Link
                  href="/"
                  className="text-sm text-foreground/70 hover:text-primary"
                >
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-8">
          <p className="text-center text-sm text-foreground/60">
            © 2026 Steno Dexter. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
