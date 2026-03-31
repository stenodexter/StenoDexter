import { Zap, Target, TrendingUp, Users } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Lightning-Fast Learning",
    description:
      "Our advanced curriculum accelerates your learning journey with proven techniques used by professionals.",
  },
  {
    icon: Target,
    title: "Precision Training",
    description:
      "Master accuracy through targeted exercises and real-world dictation practices designed for excellence.",
  },
  {
    icon: TrendingUp,
    title: "Track Your Progress",
    description:
      "Visualize your growth with detailed analytics and performance metrics at every step.",
  },
  {
    icon: Users,
    title: "Expert Community",
    description:
      "Connect with fellow stenographers and get guidance from certified instructors.",
  },
];

export function Features() {
  return (
    <section id="features" className="relative bg-background py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            Why Choose Steno Dexter?
          </h2>
          <p className="mt-4 text-lg text-foreground/70">
            Experience the future of stenographic education with our innovative
            platform.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="rounded-lg border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-foreground/70">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
