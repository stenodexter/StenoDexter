"use client";

import { IconBrightness, IconBrightness2 } from "@tabler/icons-react";
import { Button } from "~/components/ui/button";
import { useTheme } from "~/hooks/use-theme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button variant="outline" onClick={toggleTheme} className="cursor-pointer scale-115">
      <IconBrightness />
    </Button>
  );
}
