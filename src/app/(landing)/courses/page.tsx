import { Users, Clock, ArrowRight } from "lucide-react";
import { env } from "~/env";

export const metadata = {
  title: "Stenography Courses - Steno Dexter",
  description:
    "Explore comprehensive stenography courses from beginner to advanced levels.",
};

const courses = [
  {
    id: 1,
    title: "Monthly Premium Access",
    description:
      "Get full access to the complete stenography platform for one month. Practice real-time dictation tests, track your speed and accuracy, and deeply analyze your mistakes to improve consistently. Designed for focused daily practice and measurable progress.",
    level: "All Levels",
    duration: "1 month",
    students: 120,
    price: "₹1500",
    image: "/images/stuff/steno1.jpeg",
    topics: [
      "Dictation Tests",
      "Speed & Accuracy Tracking",
      "Mistake Analysis",
      "Performance Insights",
      "Progress Reports",
    ],
    href: `${env.APP_URL}/user`,
  },
  {
    id: 2,
    title: "Intermediate Speed Building",
    description:
      "Increase your writing speed while maintaining accuracy through advanced techniques.",
    level: "Intermediate",
    duration: "10 weeks",
    students: 130,
    price: "$49",
    image: "/images/stuff/steno1.jpeg",
    topics: [
      "Speed Techniques",
      "Dictation",
      "Common Phrases",
      "Abbreviations",
    ],
    href: "https://google.com",
  },
];

export default function CoursesPage() {
  return (
    <div className="space-y-16 py-12 md:py-20">
      {/* Hero Section */}
      <section className="container mx-auto mt-[60px] px-4">
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <h1 className="text-logo text-4xl font-bold tracking-tight sm:text-5xl">
            Our Courses
          </h1>
          <p className="text-muted-foreground text-lg">
            From beginner to professional, we have the perfect course to
            accelerate your stenography journey.
          </p>
        </div>
      </section>

      {/* Courses Grid */}
      <section className="container mx-auto px-4">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <div
              key={course.id}
              className="group border-border bg-card flex flex-col overflow-hidden rounded-lg border transition-all duration-300 hover:shadow-lg"
            >
              {/* Course Header */}
              <div
                className="h-32 bg-cover bg-center"
                style={{ backgroundImage: `url(${course.image})` }}
              />

              {/* Course Content */}
              <div className="flex flex-1 flex-col gap-4 p-6">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="group-hover:text-primary text-lg font-semibold transition-colors">
                      {course.title}
                    </h3>
                  </div>
                  <span className="bg-primary/10 text-primary inline-block rounded-full px-3 py-1 text-xs font-medium">
                    {course.level}
                  </span>
                </div>

                <p className="text-muted-foreground text-sm">
                  {course.description}
                </p>

                {/* Topics */}
                <div className="flex flex-wrap gap-1">
                  {course.topics.slice(0, 2).map((topic, idx) => (
                    <span
                      key={idx}
                      className="bg-muted text-muted-foreground rounded px-2 py-1 text-xs"
                    >
                      {topic}
                    </span>
                  ))}
                  {course.topics.length > 2 && (
                    <span className="bg-muted text-muted-foreground rounded px-2 py-1 text-xs">
                      +{course.topics.length - 2} more
                    </span>
                  )}
                </div>

                {/* Metadata */}
                <div className="border-border text-muted-foreground flex flex-wrap gap-4 border-t pt-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {course.duration}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {course.students} students
                  </div>
                </div>

                {/* Footer */}
                <div className="border-border mt-auto flex items-center justify-between border-t pt-4">
                  <div className="text-primary text-lg font-bold">
                    {course.price}
                  </div>
                  <a
                    href={course.href}
                    target="_blank"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
                  >
                    Enroll
                    <ArrowRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
