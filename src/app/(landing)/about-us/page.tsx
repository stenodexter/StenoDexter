import { ArrowRight, CheckCircle } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "About Steno Dexter - Our Mission & Story",
  description:
    "Discover how Steno Dexter is revolutionizing stenography education with technology and expert instruction.",
};

export default function AboutUs() {
  return (
    <div className="space-y-16 py-12 md:py-20">
      {/* Hero Section */}
      <section className="container mx-auto mt-[60px] px-4">
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <h1 className="text-primary text-4xl font-bold tracking-tight sm:text-5xl">
            About Steno Dexter
          </h1>
          <p className="text-muted-foreground text-lg">
            We&apos;re on a mission to make stenography accessible, engaging and
            achievable for everyone.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* LEFT */}
          <div className="space-y-6">
            <h2 className="text-primary text-3xl font-bold">Our Objective</h2>

            <p className="text-muted-foreground">
              Welcome to Steno Dexter—your trusted platform for Pitman Shorthand
              Book and stenography exam preparation.
            </p>

            <p className="text-muted-foreground">
              This platform is specially designed for aspirants preparing for
              SSC, RSMSSB, High Courts, District Courts, Railways and other
              Government exams. We provide exam-oriented stenography dictations
              in accordance with the latest exam patterns to help students
              improve their speed, accuracy and transcription skills.
            </p>

            <p className="text-muted-foreground text-sm">
              🎯 Our mission is to make shorthand learning easy, practical and
              result-oriented so that every aspirant can achieve success with
              confidence.
            </p>
          </div>

          {/* RIGHT (Gradient Box) */}
          <div className="from-primary/10 to-accent/10 rounded-lg bg-gradient-to-br p-8">
            <div className="space-y-6">
              <div>
                <p className="text-primary font-semibold">
                  At Steno Dexter, you will find:
                </p>

                <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
                  <li>
                    ✔ Pitman Shorthand lessons (Basics to Advanced levels)
                  </li>
                  <li>✔ Daily exam-oriented dictations practice</li>
                  <li>✔ Transcription guidance and techniques</li>
                  <li>✔ Speed-building strategies</li>
                  <li>✔ Explanation Session after dictation</li>
                </ul>
              </div>

              <p className="text-muted-foreground text-sm font-medium">
                📈 Enroll to Steno Dexter and start your journey towards
                becoming a successful Stenographer.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="container mx-auto px-4">
        <div className="space-y-12">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold">Our Core Values</h2>
            <p className="text-muted-foreground mt-4">
              Everything we do is guided by these principles
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                title: "Excellence",
                description:
                  "We are committed to deliver the highest quality education and support to our learners.",
              },
              {
                title: "Innovation",
                description:
                  "We constantly evolve our platform with the latest technology to enhance learning outcomes.",
              },
              {
                title: "Accessibility",
                description:
                  "We believe stenography education should be available to everyone, everywhere and at any time.",
              },
              {
                title: "Community",
                description:
                  "We foster a supportive community where learners can connect, share and grow together.",
              },
              {
                title: "Integrity",
                description:
                  "We maintain the highest ethical standards in all our interactions and operations.",
              },
              {
                title: "Impact",
                description:
                  "We measure success by the real and tangible progress our learners achieve.",
              },
            ].map((value, idx) => (
              <div
                key={idx}
                className="border-border bg-card rounded-lg border p-6 transition-shadow hover:shadow-lg"
              >
                <h3 className="mb-3 text-xl font-semibold">{value.title}</h3>
                <p className="text-muted-foreground text-sm">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4">
        <div className="bg-primary/5 rounded-lg px-6 py-12 text-center md:px-8 md:py-16">
          <h2 className="mb-4 text-3xl font-bold">
            Ready to Master Stenography?
          </h2>
          <p className="text-muted-foreground mx-auto mb-8 max-w-2xl">
            Join hundreds of thousands of learners who have transformed their
            stenography skills with Steno Dexter.
          </p>
          <Link
            href="/user"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-6 py-3 font-semibold transition-colors"
          >
            Get Started Today
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
