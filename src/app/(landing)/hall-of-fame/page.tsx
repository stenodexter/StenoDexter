'use client';

import { useState } from 'react';
import { Trophy, Award } from 'lucide-react';

export const metadata = {
  title: 'Hall of Fame - Steno Dexter Champions',
  description: 'Meet our most accomplished stenographers and certified professionals.',
};

interface Alumni {
  id: number;
  name: string;
  achievement: string;
  specialty: string;
  badge: string;
  color: string;
}

const alumni: Alumni[] = [
  {
    id: 1,
    name: 'Sarah Johnson',
    achievement: 'Fastest Typist 2024',
    specialty: 'Legal Stenography',
    badge: '320 WPM',
    color: 'from-yellow-400 to-orange-400',
  },
  {
    id: 2,
    name: 'Michael Chen',
    achievement: 'Perfect Accuracy Award',
    specialty: 'Medical Stenography',
    badge: '99.9% Accuracy',
    color: 'from-blue-400 to-cyan-400',
  },
  {
    id: 3,
    name: 'Emily Rodriguez',
    achievement: 'CART Excellence Award',
    specialty: 'Real-time Translation',
    badge: 'CART Certified',
    color: 'from-pink-400 to-red-400',
  },
  {
    id: 4,
    name: 'James Wilson',
    achievement: 'Most Improved Student',
    specialty: 'Professional Stenography',
    badge: '150% Improvement',
    color: 'from-green-400 to-emerald-400',
  },
  {
    id: 5,
    name: 'Lisa Anderson',
    achievement: 'Instructor Excellence',
    specialty: 'Course Creation',
    badge: '50+ Courses',
    color: 'from-purple-400 to-pink-400',
  },
  {
    id: 6,
    name: 'David Kumar',
    achievement: 'Certification Master',
    specialty: 'All Certifications',
    badge: '5 Certifications',
    color: 'from-indigo-400 to-blue-400',
  },
  {
    id: 7,
    name: 'Jennifer Martinez',
    achievement: 'Community Champion',
    specialty: 'Peer Mentoring',
    badge: '500+ Mentees',
    color: 'from-rose-400 to-pink-400',
  },
  {
    id: 8,
    name: 'Alexander Thompson',
    achievement: 'Innovation Leader',
    specialty: 'AI Integration',
    badge: 'Tech Pioneer',
    color: 'from-cyan-400 to-blue-400',
  },
];

export default function HallOfFame() {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div className="space-y-16 py-12 md:py-20">
      {/* Hero Section */}
      <section className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <div className="flex items-center justify-center gap-3">
            <Trophy className="h-10 w-10 text-accent" />
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Hall of Fame
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Celebrating our most accomplished and inspiring stenographers who have
            achieved excellence through dedication and hard work.
          </p>
        </div>
      </section>

      {/* Alumni Grid */}
      <section className="container mx-auto px-4">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {alumni.map((person) => (
            <div
              key={person.id}
              className="group relative h-80 cursor-pointer overflow-hidden rounded-lg"
              onClick={() =>
                setExpandedId(expandedId === person.id ? null : person.id)
              }
            >
              {/* Background Gradient */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${person.color} opacity-20 transition-opacity duration-300 group-hover:opacity-30`}
              />

              {/* Placeholder Image Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-400 to-slate-600" />

              {/* Content */}
              <div className="relative h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
                {/* Avatar Circle */}
                <div
                  className={`relative h-24 w-24 rounded-full bg-gradient-to-br ${person.color} flex items-center justify-center text-4xl font-bold text-white shadow-lg transition-transform duration-300 group-hover:scale-110`}
                >
                  {person.name.charAt(0)}
                </div>

                {/* Name - Always Visible */}
                <h3 className="text-xl font-bold text-white drop-shadow-lg">
                  {person.name}
                </h3>

                {/* Info - Appears on Hover */}
                <div
                  className={`absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 p-6 text-center transition-all duration-300 ${
                    expandedId === person.id ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <div className="space-y-3 flex-1 flex flex-col justify-center">
                    {/* Badge */}
                    <div className="inline-flex items-center justify-center gap-2">
                      <Award className="h-5 w-5 text-accent" />
                      <span className="rounded-full bg-accent/20 px-3 py-1 text-sm font-semibold text-accent">
                        {person.badge}
                      </span>
                    </div>

                    {/* Achievement */}
                    <h4 className="text-lg font-semibold text-white">
                      {person.achievement}
                    </h4>

                    {/* Specialty */}
                    <p className="text-sm text-gray-300">
                      {person.specialty}
                    </p>
                  </div>

                  {/* Click hint */}
                  <p className="text-xs text-gray-400">Click to close</p>
                </div>
              </div>

              {/* Hover Border */}
              <div className="absolute inset-0 rounded-lg border-2 border-transparent transition-colors duration-300 group-hover:border-accent/50" />
            </div>
          ))}
        </div>
      </section>

      {/* Achievements Section */}
      <section className="container mx-auto px-4">
        <div className="space-y-12">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold">Recognition Categories</h2>
            <p className="mt-4 text-muted-foreground">
              We honor excellence across multiple dimensions
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                category: 'Speed Excellence',
                description: 'Fastest stenographers achieving over 300 WPM',
                count: '142',
              },
              {
                category: 'Accuracy Masters',
                description: 'Perfect or near-perfect accuracy records',
                count: '89',
              },
              {
                category: 'Certified Professionals',
                description: 'Successfully certified stenographers',
                count: '3,456',
              },
              {
                category: 'Instructors',
                description: 'Expert educators creating quality courses',
                count: '48',
              },
              {
                category: 'Community Leaders',
                description: 'Active mentors and community contributors',
                count: '234',
              },
              {
                category: 'Innovation Champions',
                description: 'Pioneers in new stenography techniques',
                count: '56',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-border bg-card p-6 hover:shadow-lg transition-shadow text-center"
              >
                <div className="mb-3 text-3xl font-bold text-primary">
                  {item.count}
                </div>
                <h3 className="mb-2 font-semibold">{item.category}</h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote Section */}
      <section className="container mx-auto px-4">
        <div className="rounded-lg border border-border bg-card p-8 md:p-12 text-center">
          <blockquote className="space-y-4">
            <p className="text-lg italic text-muted-foreground md:text-xl">
              &quot;These exceptional stenographers represent the pinnacle of what&apos;s
              possible with dedication, practice, and the right tools. They inspire
              us every day to keep improving our platform.&quot;
            </p>
            <footer className="text-sm font-semibold">
              — Steno Dexter Founders
            </footer>
          </blockquote>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4">
        <div className="rounded-lg bg-primary/5 px-6 py-12 text-center md:px-8 md:py-16">
          <h2 className="mb-4 text-3xl font-bold">Join Our Hall of Fame</h2>
          <p className="mx-auto mb-8 max-w-2xl text-muted-foreground">
            Achieve excellence in stenography and get recognized in our Hall of
            Fame. Start your journey today.
          </p>
          <a
            href="/user/auth/register"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Trophy className="h-4 w-4" />
            Start Now
          </a>
        </div>
      </section>
    </div>
  );
}
