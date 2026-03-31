import { Star, Users, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Stenography Courses - Steno Dexter",
  description: "Explore comprehensive stenography courses from beginner to advanced levels.",
};

const courses = [
  {
    id: 1,
    title: "Beginner Shorthand Mastery",
    description:
      "Start your stenography journey with the fundamentals of shorthand symbols and theory.",
    level: "Beginner",
    duration: "8 weeks",
    students: 45230,
    rating: 4.8,
    price: "$29",
    image: "bg-blue-500/10",
    topics: ["Symbols", "Basic Theory", "Speed Drills", "Writing Techniques"],
  },
  {
    id: 2,
    title: "Intermediate Speed Building",
    description:
      "Increase your writing speed while maintaining accuracy through advanced techniques.",
    level: "Intermediate",
    duration: "10 weeks",
    students: 32150,
    rating: 4.9,
    price: "$49",
    image: "bg-purple-500/10",
    topics: [
      "Speed Techniques",
      "Dictation",
      "Common Phrases",
      "Abbreviations",
    ],
  },
  {
    id: 3,
    title: "Advanced Professional Stenography",
    description:
      "Master professional-level stenography with real-world court and deposition scenarios.",
    level: "Advanced",
    duration: "12 weeks",
    students: 18900,
    rating: 4.9,
    price: "$79",
    image: "bg-amber-500/10",
    topics: [
      "Professional Standards",
      "Legal Terminology",
      "Real-time Writing",
      "Editing",
    ],
  },
  {
    id: 4,
    title: "Medical & Technical Stenography",
    description:
      "Specialize in medical and technical field stenography with industry-specific vocabulary.",
    level: "Intermediate",
    duration: "8 weeks",
    students: 12400,
    rating: 4.7,
    price: "$59",
    image: "bg-green-500/10",
    topics: [
      "Medical Terms",
      "Technical Jargon",
      "Industry Standards",
      "Specialization",
    ],
  },
  {
    id: 5,
    title: "Certification Prep Boot Camp",
    description:
      "Intensive 4-week program designed to prepare you for official stenography certification exams.",
    level: "Advanced",
    duration: "4 weeks",
    students: 8650,
    rating: 4.9,
    price: "$99",
    image: "bg-red-500/10",
    topics: [
      "Exam Format",
      "Mock Tests",
      "Time Management",
      "Last-minute Tips",
    ],
  },
  {
    id: 6,
    title: "CART & Accessibility Stenography",
    description:
      "Learn Communication Access Realtime Translation (CART) for helping individuals with hearing loss.",
    level: "Intermediate",
    duration: "10 weeks",
    students: 6230,
    rating: 4.8,
    price: "$69",
    image: "bg-pink-500/10",
    topics: ["CART Standards", "Real-time Skills", "Accessibility", "Ethics"],
  },
];

export default function CoursesPage() {
  return (
    <div className="space-y-16 py-12 md:py-20">
      {/* Hero Section */}
      <section className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Our Courses
          </h1>
          <p className="text-lg text-muted-foreground">
            From beginner to professional, we have the perfect course to accelerate
            your stenography journey.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="container mx-auto px-4">
        <div className="flex flex-wrap gap-3 justify-center">
          {["All Levels", "Beginner", "Intermediate", "Advanced"].map(
            (level) => (
              <button
                key={level}
                className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                {level}
              </button>
            )
          )}
        </div>
      </section>

      {/* Courses Grid */}
      <section className="container mx-auto px-4">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <div
              key={course.id}
              className="group flex flex-col rounded-lg border border-border bg-card hover:shadow-lg transition-all duration-300 overflow-hidden"
            >
              {/* Course Header */}
              <div className={`h-32 ${course.image}`} />

              {/* Course Content */}
              <div className="flex flex-1 flex-col gap-4 p-6">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                      {course.title}
                    </h3>
                  </div>
                  <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {course.level}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground">
                  {course.description}
                </p>

                {/* Topics */}
                <div className="flex flex-wrap gap-1">
                  {course.topics.slice(0, 2).map((topic, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground"
                    >
                      {topic}
                    </span>
                  ))}
                  {course.topics.length > 2 && (
                    <span className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
                      +{course.topics.length - 2} more
                    </span>
                  )}
                </div>

                {/* Metadata */}
                <div className="flex flex-wrap gap-4 border-t border-border pt-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {course.duration}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {(course.students / 1000).toFixed(1)}k students
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {course.rating}
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
                  <div className="text-lg font-bold text-primary">
                    {course.price}
                  </div>
                  <Link
                    href="/user/auth/register"
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Enroll
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why Our Courses */}
      <section className="container mx-auto px-4">
        <div className="space-y-12">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold">Why Enroll in Our Courses?</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                title: "Expert Instruction",
                description:
                  "Learn from certified stenography professionals with years of experience.",
              },
              {
                title: "Self-Paced Learning",
                description:
                  "Study at your own speed with lifetime access to all course materials.",
              },
              {
                title: "Real-World Projects",
                description:
                  "Practice with authentic scenarios and real-world applications.",
              },
            ].map((benefit, idx) => (
              <div key={idx} className="text-center">
                <h3 className="mb-2 text-xl font-semibold">{benefit.title}</h3>
                <p className="text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4">
        <div className="rounded-lg bg-primary/5 px-6 py-12 text-center md:px-8 md:py-16">
          <h2 className="mb-4 text-3xl font-bold">Start Learning Today</h2>
          <p className="mx-auto mb-8 max-w-2xl text-muted-foreground">
            Choose your course and begin your journey to mastering stenography.
          </p>
          <Link
            href="/user/auth/register"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Explore Courses
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
