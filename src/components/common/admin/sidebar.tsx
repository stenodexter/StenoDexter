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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarFooter,
} from "~/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
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
  Users,
  Frame,
  BellDot,
  ChevronRight,
  Gavel,
  FileText,
  Star,
  UserKey,
} from "lucide-react";
import { trpc } from "~/trpc/react";
import { useMemo } from "react";
import Image from "next/image";

const MAIN_NAV = [
  { label: "Analytics", href: "/admin/analytics", icon: BarChart2 },
  { label: "Users", href: "/admin/users", icon: Users },
  {
    label: "Hall of Fame",
    href: "/admin/hall-of-fame",
    icon: Frame,
    badge: "New",
  },
];

const TEST_TYPES = [
  { label: "All Tests", href: "/admin/tests", icon: ClipboardList },
  { label: "Legal", href: "/admin/tests?type=legal", icon: Gavel },
  { label: "General", href: "/admin/tests?type=general", icon: FileText },
  { label: "Special", href: "/admin/tests?type=special", icon: Star },
];

const MANAGE_NAV = [
  {
    label: "Admissions",
    href: "/admin/admissions",
    icon: UserKey,
    super: true,
  },
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
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const admin = trpc.admin.auth.me.useQuery();
  const isSuper = useMemo(() => admin.data?.isSuper, [admin.data]);

  const isActive = (href: string) =>
    href === "/admin"
      ? pathname === "/admin"
      : pathname.startsWith(href.split("?")[0]!);

  const isTestsSection = pathname.startsWith("/admin/tests");

  return (
    <Sidebar>
      {/* ── Brand ── */}
      <SidebarHeader className="px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-white shadow-sm">
            <Image
              src="/icon.png"
              alt="Logo"
              width={200}
              height={200}
              className="h-full w-full"
            />
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
        {/* ── Create CTA ── */}
        <div className="mb-1 px-2 pt-1">
          <Button asChild className="w-full justify-start gap-2" size="sm">
            <Link href="/admin/tests/new">
              <Plus className="h-4 w-4" />
              Create Test
            </Link>
          </Button>
        </div>

        {/* ── Main nav ── */}
        <SidebarGroup className="mb-2">
          <SidebarGroupLabel>General</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Dashboard */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/admin"}>
                  <Link href="/admin">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Tests — collapsible with type sub-items */}
              <Collapsible
                defaultOpen={isTestsSection}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton isActive={isTestsSection}>
                      <ClipboardList className="h-4 w-4" />
                      <span>Tests</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {TEST_TYPES.map(({ label, href, icon: Icon }) => {
                        // Active: exact match for "All Tests", type-param match for others
                        const active = href.includes("?type=")
                          ? pathname === "/admin/tests" &&
                            new URLSearchParams(href.split("?")[1]).get(
                              "type",
                            ) ===
                              new URLSearchParams(
                                typeof window !== "undefined"
                                  ? window.location.search
                                  : "",
                              ).get("type")
                          : pathname === "/admin/tests" &&
                            !new URLSearchParams(
                              typeof window !== "undefined"
                                ? window.location.search
                                : "",
                            ).get("type");

                        return (
                          <SidebarMenuSubItem key={href}>
                            <SidebarMenuSubButton asChild isActive={active}>
                              <Link href={href}>
                                <Icon className="h-3.5 w-3.5" />
                                {label}
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Rest of main nav */}
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

        {/* ── Manage nav ── */}
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
