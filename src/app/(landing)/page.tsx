import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import {
  ArrowRight,
  Clock,
  Zap,
  Target,
  BarChart3,
  CalendarCheck,
  TrendingUp,
  BookOpen,
} from "lucide-react";

export const metadata = {
  title: "Steno Dexter – Speed. Precision. Success.",
  description:
    "India's most trusted stenography platform. Master shorthand for SSC, High Court & government exams.",
};

const features = [
  {
    icon: Zap,
    title: "Speed-First Curriculum",
    desc: "Drills engineered to push your WPM — structured, proven, no filler.",
  },
  {
    icon: Target,
    title: "Exam-Mapped Content",
    desc: "Every lesson aligned to SSC, High Court & NHM exam patterns.",
  },
  {
    icon: CalendarCheck,
    title: "Daily Tests",
    desc: "Consistent assessment every week with detailed score breakdowns.",
  },
  {
    icon: TrendingUp,
    title: "Guaranteed Progress",
    desc: "Visible improvement in 15 days.",
  },
];

const benefits = [
  { icon: Clock, title: "Learn Anytime", desc: "24/7 access on any device." },
  {
    icon: BookOpen,
    title: "Expert-Designed",
    desc: "By certified stenography pros.",
  },
  {
    icon: BarChart3,
    title: "Performance Reports",
    desc: "Know exactly what to improve.",
  },
  {
    icon: CalendarCheck,
    title: "Weekly Tests",
    desc: "Every Sunday — stay consistent.",
  },
];

const faqs = [
  {
    q: "How quickly will I see results?",
    a: "Most students notice measurable improvement within 15–30 days of consistent daily practice. Full proficiency typically takes 3–6 months.",
  },
  {
    q: "Are courses designed for government exams?",
    a: "Yes — SSC, High Court, NHM and more. Every course is pattern-mapped by experts with real selection track records.",
  },
  {
    q: "Can I access the platform on mobile?",
    a: "Fully responsive. Works seamlessly on phone, tablet, and desktop.",
  },
  {
    q: "What is the refund policy?",
    a: "7-day money-back guarantee on all courses. No questions asked.",
  },
  {
    q: "Do I get a certificate on completion?",
    a: "Yes — a verified completion certificate for every course. Advanced professional certifications are also available.",
  },
  {
    q: "I'm a complete beginner — where do I start?",
    a: "Beginner Speed Build is built for you. It starts from zero and takes you step by step to professional-level accuracy.",
  },
];

const trustPoints = [
  "7-day money-back guarantee",
  "No credit card required to start",
  "Cancel anytime",
];

const govtBodies = [
  "SSC Stenographer",
  "High Court",
  "NHM",
  "State PSC",
  "Rail NTPC",
  "Delhi Police",
];

/* ─────────────────── PAGE ─────────────────── */

export default function LandingHome() {
  return (
    <main className="bg-background text-foreground antialiased">
      <Hero />
      <LogoStrip />
      <Features />
      <Benefits />
      <FAQ />
    </main>
  );
}

/* ─── HERO ─── */
function Hero() {
  return (
    <section className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pt-24 pb-20 text-center">
      {/* ─── BACKGROUND ─── */}

      {/* base */}
      <div className="bg-background absolute inset-0 -z-20" />

      {/* primary (LEFT focused) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] animate-[driftGlow_12s_ease-in-out_infinite] bg-[radial-gradient(ellipse_80%_60%_at_25%_-10%,hsl(var(--primary)/0.28),transparent)]"
      />

      {/* secondary (soft balance on right) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] animate-[driftGlow_16s_ease-in-out_infinite] bg-[radial-gradient(ellipse_70%_50%_at_70%_0%,hsl(var(--secondary)/0.18),transparent)]"
      />

      {/* bottom ambient glow */}
      <div
        aria-hidden
        className="bg-primary/10 pointer-events-none absolute bottom-[-120px] left-1/2 -z-10 h-[320px] w-[700px] -translate-x-1/2 animate-[driftGlow_18s_ease-in-out_infinite] blur-3xl"
      />

      {/* subtle grid (very shadcn vibe) */}
      <div
        className="absolute inset-0 -z-10 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(circle at center, black 30%, transparent 80%)",
        }}
      />

      {/* vignette */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_60%,hsl(var(--background))_100%)]" />

      {/* ─── CONTENT ─── */}

      <Badge
        variant="outline"
        className="mb-6 gap-2 rounded-full px-4 py-3 text-xs font-semibold tracking-widest uppercase backdrop-blur-sm"
      >
        <span className="bg-primary h-1.5 w-1.5 animate-pulse rounded-full" />
        India&apos;s #1 Stenography Platform
      </Badge>

      <h1 className="max-w-4xl text-5xl leading-[1.06] font-extrabold tracking-tight sm:text-6xl md:text-[72px]">
        Master Stenography.{" "}
        <span className="from-primary via-primary to-secondary bg-gradient-to-r bg-clip-text text-transparent">
          Land Your Dream Job.
        </span>
      </h1>

      <p className="text-muted-foreground mt-5 text-sm font-semibold tracking-[0.3em] uppercase">
        Speed &nbsp;&middot;&nbsp; Precision &nbsp;&middot;&nbsp; Success
      </p>

      <p className="text-muted-foreground mt-5 max-w-lg text-lg leading-relaxed">
        Structured daily practice, expert courses and weekly assessments — built
        to get you selected in SSC, High Court &amp; government exams.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button
          size="lg"
          asChild
          className="shadow-primary/20 gap-2 px-7 text-base font-semibold shadow-lg"
        >
          <Link href="/user">
            Start Today <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>

        <Button size="lg" variant="outline" asChild className="px-7 text-base">
          <Link href="/courses">Browse Courses</Link>
        </Button>
      </div>

      {/* stats */}
      <div className="border-border/70 bg-background/50 divide-border mt-16 grid grid-cols-3 divide-x overflow-hidden rounded-2xl border shadow-lg shadow-black/5 backdrop-blur-md">
        {[
          { value: "900K+", label: "Active Learners" },
          { value: "98%", label: "Success Rate" },
          { value: "15 Days", label: "Guaranteed Progress" },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-muted/20 px-8 py-5 text-center sm:px-12"
          >
            <p className="text-primary text-3xl font-extrabold">{s.value}</p>
            <p className="text-muted-foreground mt-1 text-xs">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── LOGO STRIP ─── */
function LogoStrip() {
  return (
    <div className="border-border bg-muted/20 border-y px-4 py-5">
      <p className="text-muted-foreground mb-3 text-center text-[10px] font-semibold tracking-widest uppercase">
        Our students selected in
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
        {govtBodies.map((item) => (
          <span
            key={item}
            className="text-muted-foreground/70 text-sm font-medium"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── FEATURES ─── */
function Features() {
  return (
    <section id="features" className="px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHead
          tag="Why Steno Dexter"
          title="Built for real results"
          sub="Everything on this platform is purpose-built for one outcome — getting you selected."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <Card
                key={f.title}
                className="border-border transition-shadow hover:shadow-md"
              >
                <CardHeader className="pb-2">
                  <div className="bg-primary/10 mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg">
                    <Icon className="text-primary h-5 w-5" />
                  </div>
                  <p className="font-bold">{f.title}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {f.desc}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── BENEFITS ─── */
function Benefits() {
  return (
    <section id="benefits" className="px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionHead
              tag="What You Get"
              title={
                <>
                  Everything you need
                  <br />
                  <span className="text-primary">to get selected.</span>
                </>
              }
              sub="One platform. All the structure, material and support — from beginner to job-ready."
            />
            <Button className="mt-8 gap-2" asChild>
              <Link href="/user">
                Start Learning <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
            {benefits.map((b) => {
              const Icon = b.icon;
              return (
                <Card
                  key={b.title}
                  className="hover:border-primary/40 p-4 transition-colors"
                >
                  <Icon className="text-primary mb-3 h-5 w-5" />
                  <p className="text-sm font-semibold">{b.title}</p>
                  <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    {b.desc}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── FAQ ─── */
function FAQ() {
  return (
    <section id="faq" className="bg-muted/30 px-4 py-24">
      <div className="mx-auto max-w-2xl">
        <SectionHead
          tag="FAQ"
          title="Common questions"
          sub="Everything you would want to know before enrolling."
          center
        />
        <Accordion type="single" collapsible className="mt-10 w-full">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-[15px] font-semibold">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

/* ─── SHARED ─── */
function SectionHead({
  tag,
  title,
  sub,
  center = false,
}: {
  tag: string;
  title: React.ReactNode;
  sub?: string;
  center?: boolean;
}) {
  return (
    <div className={center ? "text-center" : ""}>
      <p className="text-primary mb-2 text-xs font-semibold tracking-widest uppercase">
        {tag}
      </p>
      <h2 className="text-4xl leading-tight font-extrabold tracking-tight">
        {title}
      </h2>
      {sub && (
        <p
          className={`text-muted-foreground mt-3 leading-relaxed ${
            center ? "mx-auto max-w-md" : "max-w-md"
          }`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
