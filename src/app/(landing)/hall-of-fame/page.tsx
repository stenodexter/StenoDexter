"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Trophy, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { trpc } from "~/trpc/react";

const PAGE_LIMIT = 25;

export default function HallOfFame() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [allItems, setAllItems] = useState<
    Array<{
      id: string;
      name: string;
      department: string;
      batch: string;
      note: string;
      photoUrl?: string | null;
    }>
  >([]);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, isFetching } = trpc.hof.list.useQuery(
    { page, limit: PAGE_LIMIT },
    { staleTime: 60_000 },
  );

  // Accumulate pages
  useEffect(() => {
    if (!data) return;

    const mapped = data.data.map((d) => ({
      id: d.id,
      name: d.name,
      department: d.department,
      batch: d.batch ?? "",
      note: d.note ?? "",
      photoUrl: d.photoUrl ?? null,
    }));

    setAllItems((prev) => (page === 0 ? mapped : [...prev, ...mapped]));
    setHasMore(page < data.totalPages - 1);
  }, [data, page]);

  // Intersection observer triggers next page
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && hasMore && !isFetching) {
        setPage((p) => p + 1);
      }
    },
    [hasMore, isFetching],
  );

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      rootMargin: "300px",
      threshold: 0,
    });
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [handleObserver]);

  return (
    <div className="pt-[260px] space-y-16 py-12 md:py-20">
      {/* Header */}
      <section className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <h1 className="text-primary tracking-wide uppercase">
            Hall of Fame
          </h1>
          <h2 className="tracking-tight">
            Our Selections
          </h2>
          <p className="text-muted-foreground">
            Students who have cleared Government exams through dedicated practice and
            expert guidance.
          </p>
        </div>
      </section>

      {/* Photo Grid */}
      <section className="container mx-auto px-4">
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4">
          {allItems.map((person) => {
            const initials = person.name
              .split(" ")
              .map((n) => n[0])
              .join("");
            const isHovered = hoveredId === person.id;

            return (
              <div
                key={person.id}
                className="bg-muted relative aspect-[3/4] cursor-pointer overflow-hidden"
                onMouseEnter={() => setHoveredId(person.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Photo */}
                {person.photoUrl && (
                  <img
                    src={person.photoUrl}
                    alt={person.name}
                    className="h-full w-full object-cover object-top transition-transform duration-500 ease-out"
                    style={{
                      transform: isHovered ? "scale(1.04)" : "scale(1)",
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}

                {/* Initials fallback */}
                <div className="bg-muted absolute inset-0 -z-10 flex items-center justify-center">
                  <span className="text-muted-foreground/25 text-5xl font-extrabold">
                    {initials}
                  </span>
                </div>

                {/* Hover overlay */}
                <div
                  className="absolute inset-0 flex flex-col justify-end p-4 transition-opacity duration-300"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.35) 50%, transparent 100%)",
                    opacity: isHovered ? 1 : 0,
                  }}
                >
                  <p className="text-base leading-tight font-bold text-white">
                    {person.name}
                  </p>
                  <p className="mt-0.5 text-xs text-white/70">
                    {person.department}
                  </p>
                  <p className="mt-2 text-xs text-white/60">{person.note}</p>
                  <p className="text-primary mt-1 text-[10px] font-semibold tracking-widest uppercase">
                    Batch {person.batch}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Sentinel — sits just below the grid */}
        <div ref={sentinelRef} className="h-1" />

        {/* Spinner */}
        {isFetching && (
          <div className="flex justify-center py-10">
            <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          </div>
        )}

        {/* End message */}
        {!hasMore && allItems.length > 0 && !isFetching && (
          <p className="text-muted-foreground py-10 text-center text-xs">
            Showing all {allItems.length} selections
          </p>
        )}
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4">
        <Card className="border-primary/10 bg-primary/5">
          <CardContent className="py-12 text-center md:py-16">
            <h2 className="mb-2 text-3xl font-extrabold tracking-tight">
              Your name could be here.
            </h2>
            <p className="text-muted-foreground mx-auto mb-8 max-w-md text-sm">
              Start your journey today with consistent practice and expert guidance.
            </p>
            <Button size="lg" className="gap-2" asChild>
              <a href="/user">
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
