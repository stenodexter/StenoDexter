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
  SidebarSeparator,
} from "~/components/ui/sidebar";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  LayoutDashboard,
  ClipboardList,
  Trophy,
  BarChart2,
  MailPlus,
  Settings,
  Plus,
  Keyboard,
  Pen,
  Frame,
  Users,
  MessageSquare,
  BellDot,
} from "lucide-react";
import { trpc } from "~/trpc/react";
import { useMemo } from "react";
import Image from "next/image";

const MAIN_NAV = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Tests", href: "/admin/tests", icon: ClipboardList },
  { label: "Leaderboard", href: "/admin/leaderboard", icon: Trophy },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart2 },
  { label: "Users", href: "/admin/users", icon: Users },
  {
    label: "Hall of Fame",
    href: "/admin/hall-of-fame",
    icon: Frame,
    badge: "New",
  },
];

const MANAGE_NAV = [
  {
    label: "Notifications",
    href: "/admin/notifications",
    icon: BellDot,
    super: true,
  },
  {
    label: "Admins & Invites",
    href: "/admin/invites",
    icon: MailPlus,
    super: true,
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const admin = trpc.admin.auth.me.useQuery();

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const isSuper = useMemo(() => admin.data?.isSuper, [admin.data]);

  return (
    <Sidebar>
      {/* ── Brand header ── */}
      <SidebarHeader className="px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-lg shadow-sm">
            <Image src={"/icon.png"} alt={"Logo"} width={200} height={200} className="h-full w-full m-0" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-logo text-base font-bold tracking-tight">
              STENO<span className="text-primary"> DEXTER</span>
            </span>
            <span className="text-muted-foreground text-[10px] font-medium tracking-widest uppercase">
              Admin Console
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* ── Create Assessment CTA ── */}
        <div className="mb-1 px-2 pt-1">
          <Button asChild className="w-full justify-start gap-2" size="sm">
            <Link href="/admin/tests/new">
              <Plus className="h-4 w-4" />
              Create Test
            </Link>
          </Button>
        </div>

        {/* ── Main navigation ── */}
        <SidebarGroup className="mb-3">
          <SidebarGroupLabel>General</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {MAIN_NAV.map(({ label, href, icon: Icon, badge }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={isActive(href)}>
                    <Link
                      href={href}
                      className="flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {label}
                      </span>
                      {badge && (
                        <Badge
                          variant="secondary"
                          className="ml-auto h-5 px-1.5 text-[10px]"
                        >
                          {badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── Management navigation ── */}
        <SidebarGroup>
          <SidebarGroupLabel>Manage</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {MANAGE_NAV.filter(
                (item) => !item.super || item.super === isSuper,
              ).map(({ label, href, icon: Icon }) => (
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
          StenoDexter &middot; Admin Console
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
