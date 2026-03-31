import { CheckCircle } from "lucide-react";

const benefits = [
  {
    title: "Flexible Learning Schedule",
    description:
      "Learn at your own pace with courses accessible 24/7 from anywhere in the world.",
  },
  {
    title: "Expert-Designed Curriculum",
    description:
      "Our courses are crafted by certified stenography professionals with years of experience.",
  },
  {
    title: "Daily Practice Sessions",
    description:
      "Engage in structured daily exercises that build speed and accuracy progressively.",
  },
  {
    title: "Performance Analytics",
    description:
      "Get detailed insights into your progress with comprehensive performance reports.",
  },
  {
    title: "Weekly Assessments",
    description:
      "Track your improvement through regular tests conducted every Sunday.",
  },
  {
    title: "Community Support",
    description:
      "Connect with fellow learners and get personalized guidance from our support team.",
  },
];

export function Benefits() {
  return (
    <section id="benefits" className="bg-muted/30 py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-8">
          <div>
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Everything You Need to Succeed
            </h2>
            <p className="mt-4 text-lg text-foreground/70">
              Our comprehensive platform provides all the tools and resources
              needed to master stenography and achieve your career goals.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {benefit.title}
                  </h3>
                  <p className="mt-1 text-sm text-foreground/70">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
