"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "~/components/ui/button";
import { useCurrentReturnTo } from "~/hooks/use-return-to";
import { withReturnTo } from "~/lib/return-to";

/**
 * Carries the current (filtered) list URL into the create form so that saving
 * or cancelling returns to the list the admin started from.
 */
export function CreateTestButton() {
  const returnTo = useCurrentReturnTo();

  return (
    <Button asChild size="sm">
      <Link href={withReturnTo("/admin/tests/new", returnTo)}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Create Test
      </Link>
    </Button>
  );
}
