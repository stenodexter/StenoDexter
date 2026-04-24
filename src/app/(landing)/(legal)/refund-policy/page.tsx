import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { ArrowRight, AlertTriangle } from "lucide-react";

export const metadata: Metadata = {
  title: "Refund Policy – Steno Dexter",
  description:
    "Steno Dexter maintains a strict no-refund policy. All subscription payments are final. Please read this policy carefully before purchasing.",
};

const LAST_UPDATED = "April 2026";
const MONTHLY_PRICE = "₹1,500";

const toc = [
  { id: "subscription-pricing", label: "Subscription Pricing" },
  { id: "no-refund-policy", label: "No Refund Policy" },
  { id: "why-no-refunds", label: "Why No Refunds?" },
  { id: "cancellation", label: "Cancellation" },
  { id: "technical-issues", label: "Technical Issues" },
  { id: "fraud-disputes", label: "Fraud & Disputes" },
  { id: "contact", label: "Contact" },
];

export default function RefundPolicyPage() {
  return (
    <main className="bg-background text-foreground antialiased">
      <PolicyHero
        tag="Legal"
        title={
          <>
            Refund <em className="text-primary not-italic">Policy</em>
          </>
        }
        description="Please read this policy carefully before completing any purchase on Steno Dexter. All sales are final."
        updated={LAST_UPDATED}
      />

      {/* No-Refund Banner */}
      <div className="mx-auto max-w-5xl px-4 pt-8">
        <div className="border-destructive/25 bg-destructive/5 flex items-start gap-4 rounded-xl border px-5 py-4">
          <AlertTriangle className="text-destructive/70 mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-destructive/90 text-[14px] leading-snug font-semibold">
              No Refund Policy — All sales are final
            </p>
            <p className="text-destructive/60 mt-1 text-[13px] leading-relaxed">
              Once a subscription payment has been processed, Steno Dexter does
              not offer refunds of any kind — partial or full. We strongly
              encourage you to try our free demo before subscribing.
            </p>
          </div>
        </div>
      </div>

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
        <article className="min-w-0">
          <Section
            num={1}
            id="subscription-pricing"
            title="Subscription Pricing"
          >
            <p>
              Steno Dexter provides full platform access — including all
              courses, daily dictations, weekly tests, and performance reports —
              on a monthly subscription basis:
            </p>
            <div className="bg-primary/5 border-primary/20 my-4 inline-flex items-center gap-4 rounded-xl border px-5 py-4">
              <span className="text-primary text-3xl font-extrabold tracking-tight">
                {MONTHLY_PRICE}
              </span>
              <div className="text-[13px] leading-tight">
                <p className="text-foreground font-semibold">per month</p>
                <p className="text-muted-foreground">30 days of full access</p>
              </div>
            </div>
            <p>
              Access is granted immediately upon successful payment and remains
              active for 30 days from the date of the transaction.
            </p>
          </Section>

          <Separator className="my-8" />

          <Section num={2} id="no-refund-policy" title="No Refund Policy">
            <p>
              All payments made to Steno Dexter are{" "}
              <strong className="text-foreground font-semibold">
                strictly non-refundable
              </strong>
              . This policy applies unconditionally to:
            </p>
            <ul>
              <li>Monthly subscription fees of {MONTHLY_PRICE}</li>
              <li>
                Any partial use — no prorated refunds are issued for unused days
                within a billing cycle
              </li>
              <li>
                Cases where the student did not log in or use the platform
                during the subscription period
              </li>
              <li>
                Situations where the student failed to cancel before the next
                billing cycle
              </li>
              <li>Cases where a student changes their mind after payment</li>
              <li>
                Dissatisfaction with results due to insufficient or inconsistent
                practice
              </li>
            </ul>
            <div className="border-destructive/20 bg-destructive/5 mt-3 rounded-lg border px-4 py-3">
              <p className="text-destructive/80 text-[13px] leading-relaxed">
                <strong>No exceptions are made to this policy.</strong> By
                completing a payment, you acknowledge and accept these terms in
                full.
              </p>
            </div>
          </Section>

          <Separator className="my-8" />

          <Section num={3} id="why-no-refunds" title="Why No Refunds?">
            <p>
              Our course content — including study materials, video lessons,
              practice dictations, shorthand theory, and test banks — is
              delivered digitally and made immediately accessible upon payment.
              Because digital content cannot be &quot;returned&quot; once
              accessed, we maintain a strict no-refund policy to protect the
              integrity of our platform and the efforts of our instructors.
            </p>

            {/* Demo CTA */}
            <div className="bg-primary/5 border-primary/20 mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border px-5 py-4">
              <div>
                <p className="text-foreground text-[14px] font-semibold">
                  Try before you subscribe.
                </p>
                <p className="text-muted-foreground mt-0.5 max-w-sm text-[13px] leading-relaxed">
                  Experience the platform, course quality, and teaching style
                  for free — no payment required.
                </p>
              </div>
              <Button asChild size="sm" className="gap-2 font-bold">
                <Link href="/demo">
                  Try Free Demo <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </Section>

          <Separator className="my-8" />

          <Section num={4} id="cancellation" title="Subscription Cancellation">
            <p>
              You may cancel your subscription at any time directly from your
              account dashboard. Upon cancellation:
            </p>
            <ul>
              <li>Future automatic billing will stop immediately</li>
              <li>
                You retain full platform access until the end of your current
                30-day paid period
              </li>
              <li>
                No refund is issued for the remaining days of the current
                billing cycle
              </li>
              <li>No refund is issued for any prior billing cycles</li>
            </ul>
            <p className="mt-2">
              Cancellation does not constitute a basis for any refund claim.
            </p>
          </Section>

          <Separator className="my-8" />

          <Section num={5} id="technical-issues" title="Technical Issues">
            <p>
              In the rare event of a verified, extended technical outage caused
              entirely by Steno Dexter&apos;s infrastructure — rendering the
              platform completely inaccessible for a prolonged period — we may,
              at our sole discretion, offer a service extension (additional
              access days equivalent to the downtime). This is the only form of
              remedy available and does not constitute a cash refund.
            </p>
            <InfoCallout>
              Service extensions are granted only for verified platform-wide
              outages of significant duration. Routine maintenance, brief
              interruptions, or issues with your own device or internet
              connection do not qualify.
            </InfoCallout>
          </Section>

          <Separator className="my-8" />

          <Section
            num={6}
            id="fraud-disputes"
            title="Fraudulent Transactions & Payment Disputes"
          >
            <p>
              If you believe a payment was made to Steno Dexter without your
              knowledge or authorisation, please take the following steps:
            </p>
            <ul>
              <li>
                Contact your bank or payment provider immediately to report the
                unauthorised transaction
              </li>
              <li>
                Notify us at{" "}
                <a
                  href="mailto:support@stenodexter.com"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  support@stenodexter.com
                </a>{" "}
                with proof of the disputed charge
              </li>
              <li>
                We will cooperate fully with your financial institution during
                any investigation
              </li>
            </ul>
            <p className="mt-2">
              Please note: chargebacks initiated without first contacting us may
              result in permanent account suspension.
            </p>
          </Section>

          <Separator className="my-8" />

          <Section num={7} id="contact" title="Contact Us">
            <p>
              If you have questions about this Refund Policy or need assistance
              with your subscription, please reach us at{" "}
              <a
                href="mailto:support@stenodexter.com"
                className="text-primary underline-offset-4 hover:underline"
              >
                support@stenodexter.com
              </a>
              . We respond to all inquiries within 3–5 working days.
            </p>
          </Section>
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
