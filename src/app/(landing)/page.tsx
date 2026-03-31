import { Hero } from "~/components/landing/hero";
import { Features } from "~/components/landing/features";
import { Benefits } from "~/components/landing/benefits";
import { Courses } from "~/components/landing/courses";
import { FAQ } from "~/components/landing/faq";

export const metadata = {
  title: "Steno Dexter - Master Stenography at Your Pace",
  description:
    "Learn stenography with AI-powered practice, real-time feedback, and proven results. Join 900K+ learners achieving 98% success rate.",
};

export default function LandingHome() {
  return (
    <>
      <Hero />
      <Features />
      <Benefits />
      <Courses />
      <FAQ />
    </>
  );
}
