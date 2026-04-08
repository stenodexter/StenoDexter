"use client";

import { SidebarTrigger } from "~/components/ui/sidebar";
import { Separator } from "~/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { BellPlus, LogOut, Plus, User } from "lucide-react";
import type { api } from "~/trpc/server";
import { ThemeToggle } from "~/components/utils/theme-toggle";
import { useState } from "react";
import SendNotificationDialog from "./send-notification";
import { useLocalStorage } from "~/hooks/use-local-storage";

interface NavbarProps {
  admin: Awaited<ReturnType<typeof api.admin.auth.me>>;
}

export function AdminNavbar({ admin }: NavbarProps) {
  const [openNotify, setOpenNotify] = useState(false);
  const [_isOpen, setIsOpen] = useLocalStorage<boolean>("sidebar-open", true);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger
          className="-ml-1"
          onClick={() => setIsOpen((prev) => !prev)}
        />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <span className="text-sm font-semibold">Hi , {admin.name}</span>

        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => setOpenNotify(true)}
            className="hover:bg-secondary flex h-7 w-7 cursor-pointer items-center justify-center rounded-full"
          >
            <BellPlus className="not-hover:text-muted-foreground h-4 w-4" />
          </button>
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarImage
                  src={admin.profilePicUrl ?? undefined}
                  alt="Admin"
                />
                <AvatarFallback>{admin.name[0]}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>

              <DropdownMenuItem className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      {openNotify && (
        <SendNotificationDialog
          open={openNotify}
          onClose={() => setOpenNotify(false)}
        />
      )}
    </>
  );
}
