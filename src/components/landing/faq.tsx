"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";

const faqs = [
  {
    question: "What is stenography and why should I learn it?",
    answer:
      "Stenography is the practice of writing in shorthand using symbols and abbreviations to write quickly and accurately. It's essential for court reporting, transcription work, and government positions, offering excellent career prospects and competitive salaries.",
  },
  {
    question: "How long does it take to master stenography?",
    answer:
      "Most students see significant improvement within 15-30 days of consistent practice. Mastery typically takes 3-6 months depending on your starting level and dedication. Our courses are designed for progressive learning.",
  },
  {
    question: "Do you offer beginner-friendly courses?",
    answer:
      "Absolutely! We have specialized courses for complete beginners. Our curriculum is designed to build your skills progressively, starting from basics and advancing to professional-level proficiency.",
  },
  {
    question: "Can I access courses on mobile?",
    answer:
      "Yes, our platform is fully responsive and works seamlessly on all devices. You can learn on your smartphone, tablet, or desktop computer whenever you want.",
  },
  {
    question: "What's your refund policy?",
    answer:
      "We offer a 7-day money-back guarantee for all courses. If you're not satisfied, you can request a full refund within the first week of enrollment.",
  },
  {
    question: "Are there any government exam preparations?",
    answer:
      "Yes, we have specialized courses for SSC, High Court, and other government stenographer exams. Our courses are designed by certified professionals with years of exam experience.",
  },
  {
    question: "Do I get certificate after course completion?",
    answer:
      "Yes, upon completing any course, you receive a certificate of completion. Advanced certifications are also available for those seeking professional credentials.",
  },
  {
    question: "How often are new courses added?",
    answer:
      "We regularly update our course library with new content, advanced techniques, and specialized training. New courses are added monthly based on learner feedback.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="bg-muted/30 py-20 sm:py-32">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-lg text-foreground/70">
            Have questions? We&apos;ve got answers to help you get started.
          </p>
        </div>

        <div className="mt-12">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-foreground hover:text-primary">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-foreground/70">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
