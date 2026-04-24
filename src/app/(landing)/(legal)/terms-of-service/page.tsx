import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service – Steno Dexter",
  description:
    "Read Steno Dexter's Terms of Service. By using our platform you agree to these terms governing subscriptions, intellectual property, and platform use.",
};

const LAST_UPDATED = "April 2026";
const MONTHLY_PRICE = "₹1,500";

export default function TermsOfServicePage() {
  return (
    <main className="bg-background text-foreground antialiased">
      <PolicyHero
        tag="Legal"
        title={
          <>
            Terms of <em className="text-primary not-italic">Service</em>
          </>
        }
        description="By accessing or using Steno Dexter, you agree to be bound by these Terms. Please read them carefully before enrolling or making any payment."
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
              {toc.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-md px-3 py-1.5 text-[13px] transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <article className="min-w-0 space-y-0">
          <Section num={1} id="acceptance" title="Acceptance of Terms">
            <p>
              By registering on or accessing{" "}
              <strong className="text-foreground font-semibold">
                stenodexter.com
              </strong>
              , you confirm that you have read, understood, and agreed to these
              Terms of Service, along with our{" "}
              <PolicyLink href="/privacy">Privacy Policy</PolicyLink> and{" "}
              <PolicyLink href="/refund">Refund Policy</PolicyLink>. If you do
              not agree to any part of these Terms, you may not access or use
              the platform.
            </p>
            <p>
              These Terms apply to all visitors, registered users, and paying
              subscribers of Steno Dexter.
            </p>
          </Section>

          <Separator className="my-8" />

          <Section num={2} id="platform-use" title="Platform Use">
            <p>
              You agree to use Steno Dexter solely for lawful, personal,
              non-commercial purposes. You must not:
            </p>
            <ul>
              <li>
                Share your account credentials or allow others to access your
                account
              </li>
              <li>
                Copy, reproduce, record, screenshot, or distribute any course
                content — including videos, dictations, notes, or question banks
                — without prior written permission
              </li>
              <li>
                Attempt to reverse-engineer, scrape, or disrupt the platform or
                its underlying technology
              </li>
              <li>
                Upload, transmit, or distribute harmful, offensive, or unlawful
                content
              </li>
              <li>
                Use automated tools, bots, or scripts to access the platform
              </li>
              <li>
                Misrepresent your identity or impersonate any other person
              </li>
            </ul>
            <WarningCallout>
              <strong>Sharing paid content is a violation.</strong> Any account
              found distributing course material without authorisation will be
              permanently suspended without notice or refund.
            </WarningCallout>
          </Section>

          <Separator className="my-8" />

          <Section
            num={3}
            id="subscription-pricing"
            title="Subscription & Pricing"
          >
            <p>
              Access to Steno Dexter courses and platform features is provided
              on a monthly subscription basis:
            </p>

            {/* Price card */}
            <div className="bg-primary/5 border-primary/20 my-4 inline-flex items-center gap-4 rounded-xl border px-5 py-4">
              <span className="text-primary text-3xl font-extrabold tracking-tight">
                {MONTHLY_PRICE}
              </span>
              <div className="text-[13px] leading-tight">
                <p className="text-foreground font-semibold">per month</p>
                <p className="text-muted-foreground">30 days of full access</p>
              </div>
            </div>

            <ul>
              <li>
                Subscription is charged at the start of each billing cycle
              </li>
              <li>
                Full platform access — courses, dictations, and weekly tests —
                is granted immediately upon payment
              </li>
              <li>
                Pricing may be revised with prior notice communicated to
                registered users by email
              </li>
              <li>
                All payments are processed securely through third-party
                gateways; we do not store card details
              </li>
            </ul>
            <p className="mt-2">
              For refund-related information, please refer to our{" "}
              <PolicyLink href="/refund">Refund Policy</PolicyLink>.
            </p>
          </Section>

          <Separator className="my-8" />

          <Section
            num={4}
            id="intellectual-property"
            title="Intellectual Property"
          >
            <p>
              All content available on Steno Dexter — including but not limited
              to course videos, audio dictations, Pitman Shorthand materials,
              practice exercises, performance reports, question banks, platform
              design, and branding — is the exclusive intellectual property of
              Steno Dexter and its creators.
            </p>
            <p>
              You are granted a limited, personal, non-transferable licence to
              access course content during an active subscription period only.
              This licence does not permit reproduction, redistribution, resale,
              or any commercial use of our materials. Unauthorised use may
              result in legal action under applicable copyright law.
            </p>
          </Section>

          <Separator className="my-8" />

          <Section num={5} id="account-termination" title="Account Termination">
            <p>
              Steno Dexter reserves the right to suspend or permanently
              terminate any account, without prior notice, if the user:
            </p>
            <ul>
              <li>Violates any provision of these Terms of Service</li>
              <li>
                Engages in fraudulent activity or attempts to circumvent payment
              </li>
              <li>Shares, distributes, or resells paid course content</li>
              <li>Harasses, abuses, or threatens other users or staff</li>
            </ul>
            <p className="mt-2">
              Upon termination, access to all course materials will cease
              immediately. No refund will be issued for terminations arising
              from a Terms violation.
            </p>
          </Section>

          <Separator className="my-8" />

          <Section num={6} id="disclaimers" title="Disclaimers">
            <p>
              Steno Dexter is provided on an &quot;as is&quot; and &quot;as
              available&quot; basis. While we strive for continuous platform
              availability and high-quality content, we do not guarantee that:
            </p>
            <ul>
              <li>
                The platform will be error-free or uninterrupted at all times
              </li>
              <li>
                Use of our courses will result in passing any specific
                government examination
              </li>
              <li>
                Speed or accuracy targets mentioned are achievable within the
                stated timeframe for every individual learner
              </li>
            </ul>
            <InfoCallout>
              Results depend significantly on individual consistency and effort.
              We provide the structure, tools, and expert content — the practice
              is yours to do.
            </InfoCallout>
          </Section>

          <Separator className="my-8" />

          <Section
            num={7}
            id="limitation-of-liability"
            title="Limitation of Liability"
          >
            <p>
              To the maximum extent permitted by law, Steno Dexter, its
              directors, instructors, and employees shall not be liable for any
              indirect, incidental, special, or consequential damages arising
              from your use of or inability to use the platform — including but
              not limited to loss of data, missed exam opportunities, or failure
              to achieve a desired exam outcome.
            </p>
            <p>
              Our total liability for any claim arising from use of the platform
              shall not exceed the subscription amount paid by you in the most
              recent billing cycle.
            </p>
          </Section>

          <Separator className="my-8" />

          <Section num={8} id="governing-law" title="Governing Law">
            <p>
              These Terms of Service are governed by and construed in accordance
              with the laws of India. Any disputes arising from or related to
              these Terms or your use of Steno Dexter shall be subject to the
              exclusive jurisdiction of competent courts in India.
            </p>
          </Section>

          <Separator className="my-8" />

          <Section num={9} id="contact" title="Contact Us">
            <p>
              For questions, clarifications, or concerns regarding these Terms
              of Service, please reach us at{" "}
              <a
                href="mailto:support@stenodexter.com"
                className="text-primary underline-offset-4 hover:underline"
              >
                support@stenodexter.com
              </a>
              . We aim to respond to all queries within 3–5 working days.
            </p>
          </Section>
        </article>
      </div>
    </main>
  );
}

/* ── TOC DATA ── */
const toc = [
  { id: "acceptance", label: "Acceptance of Terms" },
  { id: "platform-use", label: "Platform Use" },
  { id: "subscription-pricing", label: "Subscription & Pricing" },
  { id: "intellectual-property", label: "Intellectual Property" },
  { id: "account-termination", label: "Account Termination" },
  { id: "disclaimers", label: "Disclaimers" },
  { id: "limitation-of-liability", label: "Limitation of Liability" },
  { id: "governing-law", label: "Governing Law" },
  { id: "contact", label: "Contact" },
];

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
      <div className="text-muted-foreground [&_ul_li]:before:bg-primary/60 space-y-3 text-[14px] leading-relaxed [&_ul]:mt-2 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-4 [&_ul_li]:relative [&_ul_li]:before:absolute [&_ul_li]:before:top-[0.55em] [&_ul_li]:before:-left-3 [&_ul_li]:before:h-1 [&_ul_li]:before:w-1 [&_ul_li]:before:rounded-full">
        {children}
      </div>
    </section>
  );
}

function InfoCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-primary/5 border-primary/20 mt-3 rounded-lg border px-4 py-3">
      <p className="text-muted-foreground text-[13px] leading-relaxed">
        {children}
      </p>
    </div>
  );
}

function WarningCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-destructive/20 bg-destructive/5 mt-3 rounded-lg border px-4 py-3">
      <p className="text-destructive/80 text-[13px] leading-relaxed">
        {children}
      </p>
    </div>
  );
}

function PolicyLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-primary underline-offset-4 hover:underline"
    >
      {children}
    </Link>
  );
}
