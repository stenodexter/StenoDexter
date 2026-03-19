"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
} from "~/components/ui/sidebar";
import {
  Trophy,
  Star,
  Settings,
  Pen,
  Frame,
  LayoutDashboard,
} from "lucide-react";

const MAIN_NAV = [
  { label: "Dashboard", href: "/user/", icon: LayoutDashboard },
  { label: "Attempts", href: "/user/attempts", icon: Star },
  { label: "Leaderboard", href: "/user/leaderboard", icon: Trophy },
  { label: "Hall of Fame", href: "/user/hall-of-fame", icon: Frame },
];

const SETTINGS_NAV = [
  { label: "Settings", href: "/user/settings", icon: Settings },
];

export function UserSidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <Sidebar>
      {/* ── Brand header ── */}
      <SidebarHeader className="px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-lg shadow-sm">
            <Pen className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-base font-bold tracking-tight">
              Steno<span className="text-primary">Dexter</span>
            </span>
            <span className="text-muted-foreground text-[10px] font-medium tracking-widest uppercase">
              Dashboard
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* ── Main navigation ── */}
        <SidebarGroup className="mb-3">
          <SidebarGroupLabel>General</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {MAIN_NAV.map(({ label, href, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={isActive(href)}>
                    <Link href={href}>
                      <Icon className="h-4 w-4" />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── Settings navigation ── */}
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {SETTINGS_NAV.map(({ label, href, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={isActive(href)}>
                    <Link href={href}>
                      <Icon className="h-4 w-4" />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer ── */}
      <SidebarFooter className="px-4 py-3">
        <p className="text-muted-foreground text-[11px]">
          StenoDexter &middot; User Dashboard
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
