import Link from "next/link";
import Image from "next/image";
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
  CheckCircle2,
} from "lucide-react";

export const metadata = {
  title: "Steno Dexter – Speed. Precision. Success.",
  description:
    "India's leading platform for stenography. Master Pitman Shorthand Book, Dictations and live classes for SSC, RSMSSB, High Courts, District Courts, Railways and other Government exams.",
};

const features = [
  {
    icon: BookOpen,
    title: "Pitman Shorthand Instructor",
    desc: "We provide expert training from basics to advanced levels.",
  },
  {
    icon: Zap,
    title: "Daily Dictations",
    desc: "Practice daily exam-oriented dictations and live explanation session.",
  },
  {
    icon: Target,
    title: "Focused Speed Development",
    desc: "Achieve 80 to 120 wpm with proven methods.",
  },
  {
    icon: TrendingUp,
    title: "Guaranteed Progress",
    desc: "Visible improvement in just 15 days.",
  },
];

const benefits = [
  { icon: Clock, title: "Learn Anytime", desc: "24/7 access." },
  {
    icon: BookOpen,
    title: "Expert-Designed",
    desc: "By certified stenography professionals.",
  },
  {
    icon: BarChart3,
    title: "Performance Reports",
    desc: "Know exactly what to improve.",
  },
  {
    icon: CalendarCheck,
    title: "Weekly Tests",
    desc: "Every Saturday — stay consistent.",
  },
];

const faqs = [
  {
    q: "How quickly will I see results?",
    a: "Most students notice measurable improvement within 15–30 days of consistent daily practice. Full proficiency typically takes 3–6 months.",
  },
  {
    q: "Are courses designed for Government exams?",
    a: "Yes — we target SSC, RSMSSB, High Courts, District Court, Railways and other Government exams. Every course is designed by experts.",
  },
  {
    q: "I'm a complete beginner — where do I start?",
    a: "We teach Pitman Shorthand Book from basics to advanced levels including daily exam-oriented dictations and live classes.",
  },
];

const govtBodies = [
  "SSC",
  "RSMSSB",
  "High Courts",
  "District Courts",
  "Railways",
];

const steps = [
  {
    num: "01",
    title: "Enroll",
    desc: "Choose the right course designed with an exam-focused roadmap from day one.",
  },
  {
    num: "02",
    title: "Practice Consistently",
    desc: "Build speed and accuracy through exam-oriented dictations — legal and general.",
  },
  {
    num: "03",
    title: "Track Performance",
    desc: "Evaluate your progress with regular transcription and real exam-level dictations.",
  },
  {
    num: "04",
    title: "Achieve Results",
    desc: "Enter exams with confidence and convert your preparation into selection.",
  },
];

export default function LandingHome() {
  return (
    <main className="bg-background text-foreground antialiased">
      <Hero />
      <LogoStrip />
      <HowItWorks />
      <Features />
      <Benefits />
      <StudySection />
      <Motivation />
      <FAQ />
    </main>
  );
}

function Hero() {
  return (
    <section className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pt-24 pb-20 text-center">
      {/* Grid background */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
      />

      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(to bottom, #1a1714 0%, transparent 25%, transparent 75%, #1a1714 100%), linear-gradient(to right, #1a1714 0%, transparent 20%, transparent 80%, #1a1714 100%)",
        }}
      />
      {/* Vignette — fades grid at edges */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, transparent 30%, hsl(var(--background)) 100%)",
        }}
      />

      {/* Badge */}
      <Badge
        variant="outline"
        className="mb-8 gap-2 rounded-full px-4 py-2 text-xs font-bold tracking-widest uppercase"
      >
        <span className="bg-primary h-1.5 w-1.5 animate-pulse rounded-full" />
        Start your journey today and move closer to your dream job
      </Badge>

      {/* Heading */}
      <h1 className="max-w-4xl text-5xl leading-[1.04] font-extrabold tracking-tight sm:text-6xl md:text-[76px]">
        Master the Art of <span className="text-primary">Stenography.</span>
        <br />
        Shape your Future.
      </h1>

      {/* Subtext */}
      <p className="text-foreground mx-auto mt-6 max-w-xl text-lg leading-relaxed">
        Daily dictations — Legal and General, Pitman Shorthand Book — Basics to
        Advance and Weekly Tests — built to get you selected in SSC, RSMSSB,
        High Courts, District Courts and other Government exams.
      </p>

      {/* Trust pills */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {["Progress in 15 days", "Exam-oriented Dictations"].map((t) => (
          <span
            key={t}
            className="border-border bg-muted/30 text-foreground rounded-full border px-4 py-1.5 text-xs font-semibold"
          >
            <span className="text-primary mr-1.5">✓</span>
            {t}
          </span>
        ))}
      </div>

      {/* CTAs */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button
          size="lg"
          asChild
          className="shadow-primary/20 gap-2 px-8 text-base font-bold shadow-lg"
        >
          <Link href="/user">
            Start Today <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button size="lg" variant="outline" asChild className="px-8 text-base">
          <Link href="/courses">Browse Courses</Link>
        </Button>
      </div>
    </section>
  );
}

/* ─── LOGO STRIP ─── */
function LogoStrip() {
  return (
    <div className="border-border bg-muted/20 border-y px-4 py-5">
      <p className="text-muted-foreground mb-3 text-center text-[10px] font-bold tracking-widest uppercase">
        Our students selected in
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
        {govtBodies.map((item) => (
          <span key={item} className="text-foreground text-sm font-semibold">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── HOW IT WORKS ─── */
function HowItWorks() {
  return (
    <section className="px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          {/* Illustration */}
          <div className="flex justify-center lg:order-2">
            <Image
              src="/illustrations/achievement.svg"
              alt="Student journey to success"
              width={480}
              height={380}
              className="w-full max-w-[480px]"
            />
          </div>

          {/* Steps */}
          <div className="lg:order-1">
            <p className="text-primary mb-2 text-xs font-bold tracking-widest uppercase">
              How It Works
            </p>
            <h2 className="text-4xl leading-tight font-extrabold tracking-tight">
              From Beginner to Selection —{" "}
              <span className="text-primary">A Proven Four-Step System.</span>
            </h2>

            <div className="mt-10 space-y-8">
              {steps.map((step) => (
                <div key={step.num} className="flex gap-5">
                  <div className="text-primary mt-0.5 text-3xl leading-none font-extrabold tabular-nums">
                    {step.num}
                  </div>
                  <div>
                    <p className="text-foreground font-bold">{step.title}</p>
                    <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── FEATURES ─── */
function Features() {
  return (
    <section id="features" className="bg-muted/20 px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHead
          tag="Why Steno Dexter"
          title={
            <>
              At Steno Dexter, we don&apos;t just teach shorthand —{" "}
              <span className="text-primary">
                we build skills that transform careers.
              </span>
            </>
          }
          sub="Everything on this platform is purpose-built for one outcome — getting you selected."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <Card
                key={f.title}
                className="border-border bg-background transition-shadow hover:shadow-md"
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
        <div className="grid items-center gap-16 lg:grid-cols-2">
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
            <Button className="mt-8 gap-2 font-bold" asChild>
              <Link href="/user">
                Start Learning <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {benefits.map((b) => {
              const Icon = b.icon;
              return (
                <Card
                  key={b.title}
                  className="hover:border-primary/40 p-4 transition-colors"
                >
                  <Icon className="text-primary mb-3 h-5 w-5" />
                  <p className="text-sm font-bold">{b.title}</p>
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

/* ─── STUDY SECTION — illustration based ─── */
function StudySection() {
  return (
    <section className="bg-muted/20 px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          {/* Illustration */}
          <div className="flex justify-center">
            <Image
              src="/illustrations/goal.svg"
              alt="Student studying shorthand at desk"
              width={460}
              height={380}
              className="w-full max-w-[460px]"
            />
          </div>

          <div>
            <p className="text-primary mb-2 text-xs font-bold tracking-widest uppercase">
              The Practice
            </p>
            <h2 className="text-4xl leading-tight font-extrabold tracking-tight">
              Master Stenography.
              <br />
              Crack Exams.
              <br />
              <span className="text-primary">Deliver Results.</span>
            </h2>
            <p className="text-foreground mt-5 max-w-md text-base leading-relaxed">
              Our expertly designed dictations accelerate learning, enabling
              students to achieve speed and accuracy faster than ever.
            </p>
            <p className="text-foreground mt-3 max-w-md text-base leading-relaxed">
              Hundreds of graded exercises and dictations take you from alphabet
              to full speed dictations — with performance tracking at every
              step.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── MOTIVATION BANNER ─── */
function Motivation() {
  return (
    <section className="px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="bg-primary relative overflow-hidden rounded-3xl px-8 py-16 md:px-16">
          {/* Decorative dots */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle, white 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          <div className="relative grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="text-primary-foreground/70 mb-3 text-xs font-bold tracking-widest uppercase">
                The Mindset
              </p>
              <h2 className="text-primary-foreground text-4xl leading-tight font-extrabold tracking-tight md:text-5xl">
                Now or Never.
              </h2>
              <p className="text-primary-foreground/80 mt-4 max-w-sm text-base leading-relaxed">
                Every topper you admire was once where you are now. The
                difference is daily practice — and the decision to start today.
              </p>
              <Button
                variant="secondary"
                className="mt-8 gap-2 px-6 font-bold"
                asChild
              >
                <Link href="/user">
                  Begin Your Journey <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            {/* Illustration */}
            <div className="flex justify-center">
              <Image
                src="/illustrations/aspire.svg"
                alt="Student achieving their goal"
                width={400}
                height={320}
                className="w-full max-w-[400px] brightness-50"
              />
            </div>
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
        <SectionHead tag="FAQ" title="Common questions" center />
        <Accordion type="single" collapsible className="mt-10 w-full">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-[15px] font-bold">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-foreground leading-relaxed">
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
      <p className="text-primary mb-2 text-xs font-bold tracking-widest uppercase">
        {tag}
      </p>
      <h2 className="text-4xl leading-tight font-extrabold tracking-tight">
        {title}
      </h2>
      {sub && (
        <p
          className={`text-foreground mt-3 leading-relaxed ${
            center ? "mx-auto max-w-md" : "max-w-md"
          }`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
