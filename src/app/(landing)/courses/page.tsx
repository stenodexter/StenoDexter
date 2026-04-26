"use client";

import { Users, ArrowRight } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { env } from "~/env";
import { Mail, Phone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { adminInfo } from "~/components/utils/comms/info";

const metadata = {
  title: "Stenography Courses - Steno Dexter",
  description:
    "Explore comprehensive stenography courses from beginner to advanced levels.",
};

const courses = [
  {
    id: 1,
    title: "Pitman Shorthand Instructor",
    description:
      "Comprehensive Pitman Shorthand course instructed by experienced trainers from basics to advanced levels.",
    level: "Beginner",
    students: 100,

    image: "/images/stuff/steno1.jpeg",
  },
  {
    id: 2,
    title: "Advanced Speed Batch",
    description:
      "Our Advanced Speed Batch is designed for aspirants aiming to achieve high speed and accuracy in stenography. The Program includes daily dictations practice with live explanation session to ensure clarity and continous improvement. Tailored for SSC, RSMSSB, High Courts, District Courts and other Government exams.",
    level: "Advanced",
    students: 100,

    image: "/images/stuff/steno1.jpeg",
    href: `${env.NEXT_PUBLIC_APP_URL}/user`,
  },
];

export default function CoursesPage() {
  const [openContact, setOpenContact] = useState(false);

  return (
    <>
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

                  {/* Metadata */}
                  <div className="border-border text-muted-foreground flex flex-wrap gap-4 border-t pt-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {course.students}+ students
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="border-border mt-auto flex items-center justify-between pt-4">
                    {course.id === 1 ? (
                      <Button onClick={() => setOpenContact(true)}>
                        Enroll
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    ) : (
                      <a
                        href={course.href}
                        target="_blank"
                        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
                      >
                        Enroll
                        <ArrowRight className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <CourseContactDialog
        title={courses[0]?.title!}
        open={openContact}
        onOpenChange={setOpenContact}
      />
    </>
  );
}

type CourseContactDialogProps = {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function CourseContactDialog({
  title,
  open,
  onOpenChange,
}: CourseContactDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contact for Enrollment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            For enrolling in this course, contact us directly:
          </p>

          <div className="flex items-center gap-3">
            <Phone className="text-primary h-4 w-4" />
            <span>{adminInfo.phone}</span>
          </div>

          <div className="flex items-center gap-3">
            <Mail className="text-primary h-4 w-4" />
            <a
              href={`https://mail.google.com/mail/?view=cm&fs=1&to=${adminInfo.email}&su=${encodeURIComponent(
                `Enrollment Inquiry - ${title}`,
              )}&body=${encodeURIComponent(
                `Hi StenoDexter Team,

I am interested in enrolling in the ${title}.

Please share further details.

Thanks.`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              {adminInfo.email}
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
