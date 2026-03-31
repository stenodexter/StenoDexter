"use client";

import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";

const courses = [
  {
    id: 1,
    title: "Beginner Speed Build",
    category: "Fundamentals",
    price: 1499,
    originalPrice: 2499,
    duration: "30 Days",
    description:
      "Perfect for beginners. Master the basics of stenography and build your foundation.",
    students: 2500,
  },
  {
    id: 2,
    title: "SSC Court Shorthand",
    category: "Government Exams",
    price: 399,
    originalPrice: 699,
    duration: "15 Days",
    description:
      "Specialized training for SSC shorthand exams. Proven techniques from experts.",
    students: 3200,
  },
  {
    id: 3,
    title: "Advanced Dictation Pack",
    category: "Advanced",
    price: 999,
    originalPrice: 1999,
    duration: "30 Days",
    description:
      "6 months of old dictations. Real exam-style practice for acceleration.",
    students: 1800,
  },
  {
    id: 4,
    title: "High Court Mastery",
    category: "Government Exams",
    price: 1500,
    originalPrice: 2500,
    duration: "Monthly",
    description:
      "Comprehensive training for High Court stenographer positions.",
    students: 1200,
  },
  {
    id: 5,
    title: "1 Year Dictation Bundle",
    category: "Complete",
    price: 1900,
    originalPrice: 2900,
    duration: "12 Months",
    description:
      "Complete package with a full year of dictation materials and exercises.",
    students: 900,
  },
  {
    id: 6,
    title: "Interview Prep Intensive",
    category: "Job Ready",
    price: 999,
    originalPrice: 1499,
    duration: "14 Days",
    description:
      "Get ready for interviews with mock tests and expert tips.",
    students: 1100,
  },
];

export function Courses() {
  return (
    <section id="courses" className="bg-background py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            Popular Courses
          </h2>
          <p className="mt-4 text-lg text-foreground/70">
            Choose from our carefully curated selection of learning paths
            tailored to your goals.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <div
              key={course.id}
              className="flex flex-col rounded-lg border border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg"
            >
              <div className="flex-1 p-6">
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <Badge variant="outline" className="mb-2">
                      {course.category}
                    </Badge>
                    <h3 className="text-lg font-semibold text-foreground">
                      {course.title}
                    </h3>
                  </div>
                </div>

                <p className="mt-2 text-sm text-foreground/70">
                  {course.description}
                </p>

                <div className="mt-4 flex items-center justify-between text-xs text-foreground/60">
                  <span>{course.duration}</span>
                  <span>{course.students.toLocaleString()} students</span>
                </div>
              </div>

              <div className="border-t border-border p-6">
                <div className="mb-4 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-foreground">
                    ₹{course.price.toLocaleString()}
                  </span>
                  <span className="text-sm text-foreground/50 line-through">
                    ₹{course.originalPrice.toLocaleString()}
                  </span>
                </div>
                <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  <Link href="/user">Enroll Now</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
