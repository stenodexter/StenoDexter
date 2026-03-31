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
import {
  Trophy,
  Star,
  Settings,
  Frame,
  LayoutDashboard,
  ClipboardList,
  ChartSpline,
  ChevronRight,
  Gavel,
  FileText,
  Sparkles,
  CreditCard,
  Scale,
} from "lucide-react";
import Image from "next/image";

const TEST_TYPES = [
  { label: "All Tests", href: "/user/tests", icon: ClipboardList },
  { label: "Legal", href: "/user/tests?type=legal", icon: Scale  },
  { label: "General", href: "/user/tests?type=general", icon: FileText },
  { label: "Special", href: "/user/tests?type=special", icon: Sparkles },
];

const MAIN_NAV = [
  { label: "My Report", href: "/user/report-card", icon: ChartSpline },
  { label: "Attempts", href: "/user/attempts", icon: Star },
  { label: "Hall of Fame", href: "/user/hall-of-fame", icon: Frame },
];

const SETTINGS_NAV = [
  { label: "Payments ", href: "/user/payments", icon: CreditCard },
  { label: "Settings", href: "/user/settings", icon: Settings },
];

export function UserSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/user"
      ? pathname === "/user"
      : pathname.startsWith(href.split("?")[0]!);

  const isTestsSection =
    pathname === "/user" || pathname.startsWith("/user/test");

  return (
    <Sidebar>
      {/* ── Brand ── */}
      <SidebarHeader className="px-4 py-4">
        <div className="flex flex-col items-center gap-2.5">
          <div className="flex h-13.5 w-13.5 items-center justify-center rounded-sm bg-white shadow-sm">
            <Image
              src="/icon.png"
              alt="Logo"
              width={300}
              height={300}
              className="h-full w-full"
            />
          </div>
          <div className="flex flex-col justify-center items-center leading-none">
            <span className="font-logo text-xl font-bold tracking-tight">
              STENO<span className="text-primary"> DEXTER</span>
            </span>
            <span className="text-muted-foreground text-[10px] font-medium tracking-widest uppercase">
              Speed. Precision. Success.
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup className="mb-2">
          <SidebarGroupLabel>General</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
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
                        const active = href.includes("?type=")
                          ? typeof window !== "undefined" &&
                            pathname === "/user" &&
                            new URLSearchParams(window.location.search).get(
                              "type",
                            ) ===
                              new URLSearchParams(href.split("?")[1]).get(
                                "type",
                              )
                          : pathname === "/user" &&
                            (typeof window === "undefined" ||
                              !new URLSearchParams(window.location.search).get(
                                "type",
                              ));
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

              {/* Rest of nav */}
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

      <SidebarFooter className="px-4 py-3">
        <p className="text-muted-foreground text-[11px]">
          StenoDexter &middot; User Dashboard
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
