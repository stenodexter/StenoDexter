import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";

export const metadata: Metadata = {
  title: "Privacy Policy – Steno Dexter",
  description:
    "Learn how Steno Dexter collects, uses, and protects your personal data. Your privacy is important to us.",
};

const LAST_UPDATED = "April 2026";

const sections = [
  {
    id: "information-we-collect",
    title: "Information We Collect",
    content: (
      <>
        <p>
          When you register for or use Steno Dexter, we may collect the
          following categories of personal data:
        </p>
        <ul>
          <li>Full name, email address, and phone number</li>
          <li>Login credentials, stored in encrypted form</li>
          <li>Course progress, dictation scores, and performance history</li>
          <li>
            Payment details, processed securely via third-party gateways — we do
            not store card information
          </li>
          <li>
            Device type, browser, and approximate location for analytics
            purposes
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "how-we-use-your-information",
    title: "How We Use Your Information",
    content: (
      <>
        <p>
          Your data is used exclusively to operate and improve the Steno Dexter
          platform:
        </p>
        <ul>
          <li>Creating and managing your student account</li>
          <li>
            Tracking learning progress and delivering personalised performance
            reports
          </li>
          <li>Processing monthly subscription payments</li>
          <li>
            Sending course updates, test reminders, and important platform
            announcements
          </li>
          <li>
            Improving platform quality through anonymised, aggregated analytics
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "data-sharing",
    title: "Data Sharing",
    content: (
      <>
        <p>
          We do not sell, rent, or trade your personal data. We share
          information only in these limited circumstances:
        </p>
        <ul>
          <li>
            With payment processors (such as Razorpay) strictly to complete
            transactions
          </li>
          <li>
            With hosting and infrastructure providers under binding data
            agreements
          </li>
          <li>
            With law enforcement or regulators when required by applicable
            Indian law
          </li>
        </ul>
        <Callout>
          We will never share your personal data with advertisers, marketing
          agencies, or any third party for commercial purposes.
        </Callout>
      </>
    ),
  },
  {
    id: "data-security",
    title: "Data Security",
    content: (
      <p>
        We use industry-standard security measures to protect your data,
        including SSL/TLS encryption, secure server infrastructure, restricted
        access controls, and regular security reviews. Despite these
        precautions, no internet transmission is 100% secure — we encourage you
        to use a strong, unique password for your account.
      </p>
    ),
  },
  {
    id: "cookies",
    title: "Cookies",
    content: (
      <p>
        Steno Dexter uses cookies to keep you logged in, save your preferences,
        and measure platform performance. We do not use third-party advertising
        cookies. You may disable cookies in your browser settings, though
        certain features — such as staying signed in — may not function
        correctly.
      </p>
    ),
  },
  {
    id: "your-rights",
    title: "Your Rights",
    content: (
      <>
        <p>As a user of Steno Dexter, you have the right to:</p>
        <ul>
          <li>Request access to the personal data we hold about you</li>
          <li>
            Request correction of any inaccurate or incomplete information
          </li>
          <li>
            Request deletion of your account and all associated personal data
          </li>
          <li>
            Withdraw consent for any non-essential data processing at any time
          </li>
        </ul>
        <p className="mt-3">
          To exercise any of these rights, contact us at{" "}
          <a
            href="mailto:support@stenodexter.com"
            className="text-primary underline-offset-4 hover:underline"
          >
            support@stenodexter.com
          </a>
          . We will respond within 7 working days.
        </p>
      </>
    ),
  },
  {
    id: "changes-to-this-policy",
    title: "Changes to This Policy",
    content: (
      <p>
        We may update this Privacy Policy from time to time. Any material
        changes will be communicated via email or a prominent notice on the
        platform. The &quot;Last updated&quot; date at the top of this page
        reflects the most recent revision. Continued use of the platform after
        changes constitutes your acceptance of the updated policy.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact Us",
    content: (
      <p>
        If you have questions or concerns about this Privacy Policy or how your
        data is handled, please write to us at{" "}
        <a
          href="mailto:support@stenodexter.com"
          className="text-primary underline-offset-4 hover:underline"
        >
          support@stenodexter.com
        </a>
        . We are committed to resolving any concerns promptly.
      </p>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="bg-background text-foreground antialiased">
      <PolicyHero
        tag="Legal"
        title={
          <>
            Privacy <em className="text-primary not-italic">Policy</em>
          </>
        }
        description="We are committed to protecting your personal information. This policy explains what we collect, how we use it, and your rights as a user of Steno Dexter."
        updated={LAST_UPDATED}
      />

      <div className="mx-auto max-w-5xl px-4 py-12 lg:grid lg:grid-cols-[220px_1fr] lg:gap-16 lg:py-16">
        {/* Sidebar TOC */}
        <aside className="mb-10 lg:mb-0">
          <div className="sticky top-24">
            <p className="text-muted-foreground mb-3 text-[10px] font-bold tracking-widest uppercase">
              Contents
            </p>
            <nav className="flex flex-col gap-0.5">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-md px-3 py-1.5 text-[13px] transition-colors"
                >
                  {s.title}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <article className="min-w-0">
          {sections.map((s, i) => (
            <div key={s.id}>
              <Section num={i + 1} id={s.id} title={s.title}>
                {s.content}
              </Section>
              {i < sections.length - 1 && <Separator className="my-8" />}
            </div>
          ))}
        </article>
      </div>
    </main>
  );
}

/* ── SHARED SUB-COMPONENTS ── */

function PolicyHero({
  tag,
  title,
  description,
  updated,
}: {
  tag: string;
  title: React.ReactNode;
  description: string;
  updated: string;
}) {
  return (
    <section className="border-border mx-auto max-w-5xl border-b px-4 pt-20 pb-10">
      <p className="text-primary mb-3 text-[10px] font-bold tracking-widest uppercase">
        {tag}
      </p>
      <h1 className="text-4xl leading-tight font-extrabold tracking-tight md:text-5xl">
        {title}
      </h1>
      <p className="text-muted-foreground mt-4 max-w-xl text-[15px] leading-relaxed">
        {description}
      </p>
      <div className="mt-5">
        <Badge variant="outline" className="text-muted-foreground text-xs">
          Last updated: {updated}
        </Badge>
      </div>
    </section>
  );
}

function Section({
  num,
  id,
  title,
  children,
}: {
  num: number;
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="text-foreground mb-4 flex items-center gap-3 text-[15px] font-bold">
        <span className="bg-primary/10 text-primary inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
          {num}
        </span>
        {title}
      </h2>
      <div className="text-muted-foreground policy-body [&_ul_li]:before:bg-primary/60 space-y-3 text-[14px] leading-relaxed [&_ul]:mt-2 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-4 [&_ul_li]:relative [&_ul_li]:before:absolute [&_ul_li]:before:top-[0.55em] [&_ul_li]:before:-left-3 [&_ul_li]:before:h-1 [&_ul_li]:before:w-1 [&_ul_li]:before:rounded-full">
        {children}
      </div>
    </section>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-primary/5 border-primary/20 mt-3 rounded-lg border px-4 py-3">
      <p
        className="text-[13px] leading-relaxed"
        style={{ color: "hsl(var(--muted-foreground))" }}
      >
        {children}
      </p>
    </div>
  );
}
