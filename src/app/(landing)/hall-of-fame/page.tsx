'use client';

import { useState } from 'react';
import { Trophy, Award, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { Card, CardContent, CardHeader } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';

export const metadata = {
  title: 'Hall of Fame - Steno Dexter Champions',
  description: 'Meet our most accomplished stenographers and certified professionals.',
};

interface HallOfFameAlumni {
  id: string;
  name: string;
  department: string;
  batch: string;
  note: string;
  photoKey?: string;
}

// Sample data aligned with database schema
const alumni: HallOfFameAlumni[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    department: 'Legal Stenography',
    batch: '2022',
    note: 'Fastest Typist 2024 - 320 WPM',
    photoKey: 'sarah-johnson',
  },
  {
    id: '2',
    name: 'Michael Chen',
    department: 'Medical Stenography',
    batch: '2021',
    note: 'Perfect Accuracy Award - 99.9% Accuracy',
    photoKey: 'michael-chen',
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    department: 'Real-time Translation',
    batch: '2023',
    note: 'CART Excellence Award - CART Certified',
    photoKey: 'emily-rodriguez',
  },
  {
    id: '4',
    name: 'James Wilson',
    department: 'Professional Stenography',
    batch: '2022',
    note: 'Most Improved Student - 150% Improvement',
    photoKey: 'james-wilson',
  },
  {
    id: '5',
    name: 'Lisa Anderson',
    department: 'Course Creation',
    batch: '2020',
    note: 'Instructor Excellence - 50+ Courses Created',
    photoKey: 'lisa-anderson',
  },
  {
    id: '6',
    name: 'David Kumar',
    department: 'Certification',
    batch: '2021',
    note: 'Certification Master - 5 Certifications',
    photoKey: 'david-kumar',
  },
  {
    id: '7',
    name: 'Jennifer Martinez',
    department: 'Community Leadership',
    batch: '2022',
    note: 'Community Champion - 500+ Mentees',
    photoKey: 'jennifer-martinez',
  },
  {
    id: '8',
    name: 'Alexander Thompson',
    department: 'AI Integration',
    batch: '2023',
    note: 'Innovation Leader - Tech Pioneer',
    photoKey: 'alexander-thompson',
  },
];

export default function HallOfFame() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
            <div key={person.id} className="h-full">
              <Card className="group relative h-full cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-lg">
                {/* Background Placeholder */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10" />

                {/* Card Content */}
                <CardHeader className="relative flex flex-col items-center gap-4 pt-6">
                  <Avatar
                    size="lg"
                    className="h-20 w-20 transition-transform duration-300 group-hover:scale-110"
                  >
                    <AvatarImage
                      src={`/images/alumni/${person.photoKey}.jpg`}
                      alt={person.name}
                    />
                    <AvatarFallback className="bg-primary text-lg font-bold text-primary-foreground">
                      {person.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </AvatarFallback>
                  </Avatar>

                  <div className="text-center">
                    <h3 className="font-bold text-lg">{person.name}</h3>
                    <Badge variant="outline" className="mt-2">
                      {person.department}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="relative space-y-3 text-center">
                  {/* Always Visible */}
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Batch {person.batch}
                    </p>
                  </div>

                  {/* Hover Reveal Content */}
                  <div
                    className={`absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-black/80 p-4 backdrop-blur-sm transition-all duration-300 ${
                      expandedId === person.id
                        ? 'opacity-100'
                        : 'opacity-0 pointer-events-none'
                    }`}
                  >
                    <Award className="h-6 w-6 text-accent" />
                    <p className="text-sm font-semibold text-white">
                      {person.note}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-white hover:bg-white/20"
                      onClick={() => setExpandedId(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>

                {/* Click trigger area */}
                <div
                  className="absolute inset-0 cursor-pointer rounded-2xl"
                  onClick={() =>
                    setExpandedId(expandedId === person.id ? null : person.id)
                  }
                />
              </Card>
            </div>
          ))}
        </div>
      </section>

      {/* Recognition Section */}
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
              <Card key={idx}>
                <CardContent className="pt-6 text-center">
                  <div className="mb-3 text-3xl font-bold text-primary">
                    {item.count}
                  </div>
                  <h3 className="mb-2 font-semibold">{item.category}</h3>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Quote Section */}
      <section className="container mx-auto px-4">
        <Card>
          <CardContent className="pt-8 md:pt-12 text-center">
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
          </CardContent>
        </Card>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4">
        <Card className="bg-primary/5">
          <CardContent className="py-12 md:py-16 text-center">
            <h2 className="mb-4 text-3xl font-bold">Join Our Hall of Fame</h2>
            <p className="mx-auto mb-8 max-w-2xl text-muted-foreground">
              Achieve excellence in stenography and get recognized in our Hall of
              Fame. Start your journey today.
            </p>
            <Button
              size="lg"
              className="gap-2"
              asChild
            >
              <a href="/user/auth/register">
                <Trophy className="h-4 w-4" />
                Start Now
              </a>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
