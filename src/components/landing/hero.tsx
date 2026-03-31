import Link from "next/link";
import { Button } from "~/components/ui/button";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-screen bg-gradient-to-b from-background to-muted/20 pt-24">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-block rounded-full bg-accent/10 px-4 py-1.5">
            <p className="text-sm font-semibold text-accent">
              Master the Art of Stenography
            </p>
          </div>

          <h1 className="bg-gradient-to-r from-primary to-accent bg-clip-text text-5xl font-bold text-transparent sm:text-6xl md:text-7xl">
            Unlock Your Stenographic Potential
          </h1>

          <p className="mt-6 text-lg text-foreground/70 sm:text-xl">
            Join thousands of students who have mastered stenography through our
            cutting-edge platform. Achieve exceptional speed and accuracy with
            personalized learning paths and expert guidance.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button
              asChild
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Link href="/user">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              asChild
            >
              <Link href="#features">Learn More</Link>
            </Button>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-8 border-t border-border pt-8">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">900K+</p>
              <p className="mt-1 text-sm text-foreground/60">Active Learners</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">98%</p>
              <p className="mt-1 text-sm text-foreground/60">
                Success Rate
              </p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">15 Days</p>
              <p className="mt-1 text-sm text-foreground/60">
                Guaranteed Improvement
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
