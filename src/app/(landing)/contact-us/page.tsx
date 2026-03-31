'use client';

import { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle } from 'lucide-react';

export const metadata = {
  title: 'Contact Us - Steno Dexter Support',
  description:
    'Get in touch with our support team. We&apos;re here to help with questions, feedback, or support.',
};

interface FormState {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface SubmitState {
  isLoading: boolean;
  isSuccess: boolean;
  error: string | null;
}

export default function ContactUs() {
  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const [submit, setSubmit] = useState<SubmitState>({
    isLoading: false,
    isSuccess: false,
    error: null,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmit({ isLoading: true, isSuccess: false, error: null });

    try {
      // Simulate form submission
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setForm({ name: '', email: '', subject: '', message: '' });
      setSubmit({ isLoading: false, isSuccess: true, error: null });

      // Reset success message after 5 seconds
      setTimeout(() => {
        setSubmit({ isLoading: false, isSuccess: false, error: null });
      }, 5000);
    } catch (err) {
      setSubmit({
        isLoading: false,
        isSuccess: false,
        error: 'Something went wrong. Please try again.',
      });
    }
  };

  return (
    <div className="space-y-16 py-12 md:py-20">
      {/* Hero Section */}
      <section className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Get In Touch
          </h1>
          <p className="text-lg text-muted-foreground">
            Have a question, feedback, or need support? We&apos;d love to hear from
            you. Our team is ready to help.
          </p>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="container mx-auto px-4">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Mail,
              title: 'Email',
              value: 'support@stenodexter.com',
              description: 'We respond within 24 hours',
            },
            {
              icon: Phone,
              title: 'Phone',
              value: '+1 (555) 123-4567',
              description: 'Mon-Fri, 9 AM - 6 PM EST',
            },
            {
              icon: MapPin,
              title: 'Office',
              value: 'San Francisco, CA',
              description: 'Head office location',
            },
          ].map((contact, idx) => {
            const Icon = contact.icon;
            return (
              <div
                key={idx}
                className="rounded-lg border border-border bg-card p-6 text-center hover:shadow-lg transition-shadow"
              >
                <Icon className="mx-auto mb-4 h-8 w-8 text-primary" />
                <h3 className="mb-2 font-semibold">{contact.title}</h3>
                <p className="mb-2 font-mono text-sm text-primary">
                  {contact.value}
                </p>
                <p className="text-xs text-muted-foreground">
                  {contact.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="container mx-auto px-4">
        <div className="grid gap-12 lg:grid-cols-3">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border border-border bg-card p-8">
              <h2 className="mb-6 text-2xl font-bold">Send us a message</h2>

              {submit.isSuccess ? (
                <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-6 text-center">
                  <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-600 dark:text-green-400" />
                  <h3 className="mb-2 font-semibold text-green-900 dark:text-green-200">
                    Message Sent Successfully
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Thank you for your message. We&apos;ll get back to you as soon as
                    possible.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm font-medium mb-2"
                      >
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                        className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium mb-2"
                      >
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        required
                        className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="subject"
                      className="block text-sm font-medium mb-2"
                    >
                      Subject
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                      required
                      className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="How can we help?"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium mb-2"
                    >
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      required
                      rows={6}
                      className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                      placeholder="Tell us more about your inquiry..."
                    />
                  </div>

                  {submit.error && (
                    <div className="rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-200">
                      {submit.error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submit.isLoading}
                    className="w-full rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {submit.isLoading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send Message
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* FAQ Sidebar */}
          <div>
            <div className="rounded-lg border border-border bg-card p-6 sticky top-4">
              <h3 className="mb-6 text-lg font-bold">Quick Help</h3>
              <div className="space-y-4">
                {[
                  {
                    question: 'How do I reset my password?',
                    answer: 'Visit the login page and click "Forgot Password".',
                  },
                  {
                    question: 'What is the refund policy?',
                    answer: '30-day money-back guarantee on all courses.',
                  },
                  {
                    question: 'How do I enroll in a course?',
                    answer: 'Browse courses and click "Enroll" to get started.',
                  },
                  {
                    question: 'Do you offer discounts?',
                    answer: 'Yes, check our special offers page for current deals.',
                  },
                ].map((faq, idx) => (
                  <details
                    key={idx}
                    className="group border-b border-border pb-4 last:border-b-0"
                  >
                    <summary className="cursor-pointer text-sm font-medium hover:text-primary transition-colors">
                      {faq.question}
                    </summary>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>

              <div className="mt-6 rounded-lg bg-primary/10 p-4">
                <p className="text-xs font-semibold text-primary mb-2">
                  Need Immediate Help?
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Chat with our support team in real-time.
                </p>
                <button className="w-full rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
                  Start Chat
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Social Links */}
      <section className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl rounded-lg border border-border bg-card p-8 text-center">
          <h2 className="mb-4 text-2xl font-bold">Follow Us</h2>
          <p className="mb-6 text-muted-foreground">
            Stay updated with the latest news and announcements
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {['Twitter', 'Facebook', 'LinkedIn', 'Instagram', 'YouTube'].map(
              (social) => (
                <button
                  key={social}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                >
                  {social}
                </button>
              )
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
