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
      <section className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            About Steno Dexter
          </h1>
          <p className="text-lg text-muted-foreground">
            We&apos;re on a mission to make stenography accessible, engaging, and
            achievable for everyone, regardless of background or experience level.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="container mx-auto px-4">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="space-y-6">
            <h2 className="text-3xl font-bold">Our Story</h2>
            <p className="text-muted-foreground">
              Steno Dexter was founded with a simple belief: stenography education
              should be accessible, engaging, and effective. We recognized that
              traditional methods left learners struggling to maintain momentum and
              track their progress.
            </p>
            <p className="text-muted-foreground">
              By combining cutting-edge AI technology with expert instruction, we
              created a platform that provides personalized guidance, real-time
              feedback, and measurable results. Our methodology has helped hundreds
              of thousands of students achieve their stenography goals.
            </p>
            <p className="text-muted-foreground">
              Today, Steno Dexter stands as the leading online stenography learning
              platform, trusted by professionals, students, and institutions
              worldwide.
            </p>
          </div>
          <div className="rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 p-8">
            <div className="space-y-6">
              <div>
                <div className="mb-2 text-4xl font-bold text-primary">900K+</div>
                <p className="text-sm text-muted-foreground">Active Learners</p>
              </div>
              <div>
                <div className="mb-2 text-4xl font-bold text-primary">98%</div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
              <div>
                <div className="mb-2 text-4xl font-bold text-primary">50+</div>
                <p className="text-sm text-muted-foreground">Expert Instructors</p>
              </div>
              <div>
                <div className="mb-2 text-4xl font-bold text-primary">15 Days</div>
                <p className="text-sm text-muted-foreground">Guaranteed Improvement</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="container mx-auto px-4">
        <div className="space-y-12">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold">Our Core Values</h2>
            <p className="mt-4 text-muted-foreground">
              Everything we do is guided by these principles
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                title: "Excellence",
                description:
                  "We are committed to delivering the highest quality education and support to our learners.",
              },
              {
                title: "Innovation",
                description:
                  "We constantly evolve our platform with the latest technology to enhance learning outcomes.",
              },
              {
                title: "Accessibility",
                description:
                  "We believe stenography education should be available to everyone, everywhere, at any time.",
              },
              {
                title: "Community",
                description:
                  "We foster a supportive community where learners can connect, share, and grow together.",
              },
              {
                title: "Integrity",
                description:
                  "We maintain the highest ethical standards in all our interactions and operations.",
              },
              {
                title: "Impact",
                description:
                  "We measure success by the real, tangible progress our learners achieve.",
              },
            ].map((value, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-border bg-card p-6 hover:shadow-lg transition-shadow"
              >
                <h3 className="mb-3 text-xl font-semibold">{value.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="container mx-auto px-4">
        <div className="space-y-12">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold">Why Choose Steno Dexter?</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {[
              "AI-powered personalized learning paths tailored to your goals",
              "Real-time feedback and comprehensive analytics",
              "Expert instructors with decades of stenography experience",
              "Flexible learning schedule that fits your lifestyle",
              "Affordable pricing with transparent, no-hidden-fee structure",
              "Lifetime access to course materials and updates",
              "Supportive community with peer and mentor connections",
              "Proven track record with 98% success rate",
            ].map((benefit, idx) => (
              <div key={idx} className="flex gap-4">
                <CheckCircle className="h-6 w-6 flex-shrink-0 text-primary" />
                <p className="text-muted-foreground">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4">
        <div className="rounded-lg bg-primary/5 px-6 py-12 text-center md:px-8 md:py-16">
          <h2 className="mb-4 text-3xl font-bold">Ready to Master Stenography?</h2>
          <p className="mx-auto mb-8 max-w-2xl text-muted-foreground">
            Join hundreds of thousands of learners who have transformed their
            stenography skills with Steno Dexter.
          </p>
          <Link
            href="/user/auth/register"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Get Started Today
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
