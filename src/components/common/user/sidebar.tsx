"use client";

import { usePathname, useSearchParams } from "next/navigation";
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
  Album,
} from "lucide-react";
import Image from "next/image";
import type { api } from "~/trpc/server";
import { Logo } from "~/components/utils/logo";

const TEST_TYPES = [
  { label: "All Tests", href: "/user/tests", icon: ClipboardList },
  { label: "Legal", href: "/user/tests?type=legal", icon: Scale },
  { label: "General", href: "/user/tests?type=general", icon: FileText },
  { label: "Special", href: "/user/tests?type=special", icon: Sparkles },
];

const MAIN_NAV = [
  { label: "Typing", href: "/user/typing-tests", icon: Album },
  { label: "My Report", href: "/user/report-card", icon: ChartSpline },
  { label: "Attempts", href: "/user/attempts", icon: Star },
];

const SETTINGS_NAV = [
  {
    label: "Payments ",
    href: "/user/payments",
    icon: CreditCard,
    hideForDemo: true,
  },
  { label: "Settings", href: "/user/settings", icon: Settings },
];

interface SidebarProps {
  user: Awaited<ReturnType<typeof api.user.me>>;
}

export function UserSidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentType = searchParams.get("type");

  function isTestTypeActive(
    href: string,
    pathname: string,
    currentType: string | null,
  ) {
    if (!pathname.startsWith("/user/tests")) return false;

    const params = href.split("?")[1];
    const typeFromHref = params
      ? new URLSearchParams(params).get("type")
      : null;

    return typeFromHref ? currentType === typeFromHref : currentType === null;
  }

  const isActive = (href: string) =>
    href === "/user"
      ? pathname === "/user"
      : pathname.startsWith(href.split("?")[0]!);

  const isTestsSection =
    pathname === "/user" || pathname.startsWith("/user/test");

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-4">
        <Link href={"/user"} className="flex flex-col items-center gap-2.5">
          <div className="flex h-13.5 w-13.5 items-center justify-center overflow-hidden rounded-sm bg-white shadow-sm">
            <Image
              src="/icon.png"
              alt="Logo"
              width={200}
              height={200}
              className="h-full w-full translate-y-0.5 scale-135 object-contain"
            />
          </div>
          <div className="flex flex-col items-center justify-center leading-none">
            <Logo />
            <span className="text-muted-foreground text-[10px] font-medium tracking-widest uppercase">
              Speed. Precision. Success.
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 pb-[100px]">
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
                      {TEST_TYPES.map(({ label, href, icon: Icon }) => (
                        <SidebarMenuSubItem key={href}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isTestTypeActive(
                              href,
                              pathname,
                              currentType,
                            )}
                          >
                            <Link href={href}>
                              <Icon className="h-3.5 w-3.5" />
                              {label}
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
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
              {SETTINGS_NAV.filter(
                (item) => !(item.hideForDemo && user?.isDemo),
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

      <SidebarFooter className="px-4 py-3">
        <p className="text-muted-foreground text-[11px]">
          StenoDexter &middot; User Dashboard
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
