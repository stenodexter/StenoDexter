import { useRouter } from "next/navigation";
import { Dialog, DialogContent } from "~/components/ui/dialog";
import {
  Bell,
  FileText,
  ShieldOff,
  TextAlignJustify,
  RefreshCw,
  ArrowRight,
  Smartphone,
  Monitor,
  Wifi,
  MapPin,
  Trash2,
  ChevronLeft,
  RefreshCcw,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { initials, type UserRow } from "./users-client";
import { cn } from "~/lib/utils";
import { format } from "date-fns";
import { Badge } from "~/components/ui/badge";
import { trpc } from "~/trpc/react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";

type Props = {
  user: UserRow | null;
  isAdmin?: boolean;
  onClose: () => void;
  onNotify: (user: UserRow) => void;
  onRevoke: (user: UserRow) => void;
};

type DeviceView = "actions" | "device";

export function UserActionsDialog({
  user,
  isAdmin,
  onClose,
  onNotify,
  onRevoke,
}: Props) {
  const router = useRouter();
  const [view, setView] = useState<DeviceView>("actions");

  const deviceQuery = trpc.device.adminGet.useQuery(
    { userId: user?.id ?? "" },
    { enabled: false },
  );

  const deviceDelete = trpc.device.adminDelete.useMutation({
    onSuccess: () => {
      void deviceQuery.refetch();
    },
  });

  function handleOpenDevice() {
    setView("device");
    void deviceQuery.refetch();
  }

  function handleClose() {
    setView("actions");
    onClose();
  }

  if (!user) return null;

  return (
    <Dialog open={!!user} onOpenChange={handleClose}>
      <DialogContent className="gap-0 overflow-hidden p-0">
        {view === "actions" ? (
          <>
            {/* Header — user identity */}
            <div className="flex items-start gap-3 px-[18px] py-[18px]">
              <Avatar className="h-11 w-11 shrink-0 rounded-xl">
                <AvatarImage src={user.profilePicUrl ?? undefined} />
                <AvatarFallback>{initials(user)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="truncate text-sm font-medium">
                  {user.name ?? user.email}
                </p>
                {user.name && (
                  <p className="text-muted-foreground truncate text-xs">
                    {user.email}
                  </p>
                )}
                <Badge variant={"outline"}>{user.userCode}</Badge>
              </div>
            </div>

            {/* Meta bar */}
            <div className="border-border flex items-center gap-2 border-y px-[18px] py-2.5">
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                Joined {format(new Date(user.createdAt), "d MMM yyyy")}
              </span>
              {user.renewCount > 0 && (
                <span className="ml-auto inline-flex items-center gap-1 rounded-[5px] bg-sky-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-sky-600 dark:text-sky-400">
                  <RefreshCw className="h-2.5 w-2.5" />
                  {user.renewCount} renewals
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="p-2.5">
              <p className="text-muted-foreground px-2 pt-1 pb-1.5 text-[10px] font-semibold tracking-[0.08em] uppercase">
                Actions
              </p>

              <ActionItem
                icon={FileText}
                iconClassName="bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-400"
                label="Report card"
                description="View full performance summary"
                onClick={() => {
                  router.push(`/admin/report-card/${user.id}`);
                  handleClose();
                }}
              />
              <ActionItem
                icon={TextAlignJustify}
                iconClassName="bg-violet-50 border-violet-200 text-violet-600 dark:bg-violet-950 dark:border-violet-800 dark:text-violet-400"
                label="Attempts"
                description="Browse all user attempts"
                onClick={() => {
                  router.push(`/admin/attempts/user/${user.id}`);
                  handleClose();
                }}
              />
              <ActionItem
                icon={Bell}
                iconClassName="bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-400"
                label="Send notification"
                description="Push an in-app or email alert"
                onClick={() => {
                  onNotify(user);
                  handleClose();
                }}
              />
              <ActionItem
                icon={Smartphone}
                iconClassName="bg-teal-50 border-teal-200 text-teal-600 dark:bg-teal-950 dark:border-teal-800 dark:text-teal-400"
                label="Device"
                description="View or reset registered device"
                onClick={handleOpenDevice}
              />
            </div>

            {isAdmin && (
              <>
                <div className="bg-border mx-[18px] h-px" />
                <div className="p-2.5">
                  <ActionItem
                    icon={ShieldOff}
                    iconClassName="bg-red-50 border-red-200 text-red-600 dark:bg-red-950 dark:border-red-800 dark:text-red-400"
                    label="Revoke subscription"
                    description="This action cannot be undone"
                    variant="danger"
                    onClick={() => {
                      onRevoke(user);
                      handleClose();
                    }}
                  />
                </div>
              </>
            )}
          </>
        ) : (
          <>
            {/* Device view header */}
            <div className="flex items-center gap-2 px-[18px] py-[14px]">
              <button
                onClick={() => setView("actions")}
                className="text-muted-foreground hover:text-foreground -ml-1 rounded-md p-1 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-sm font-medium">Device info</p>
            </div>

            <div className="bg-border mx-[18px] h-px" />

            {/* Device content */}
            <div className="p-4">
              {deviceQuery.isLoading ? (
                <div className="flex flex-col gap-2.5 py-2">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="bg-muted h-10 animate-pulse rounded-lg"
                    />
                  ))}
                </div>
              ) : !deviceQuery.data ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-xl">
                    <Smartphone className="text-muted-foreground h-5 w-5" />
                  </div>
                  <p className="text-sm font-medium">No device registered</p>
                  <p className="text-muted-foreground text-xs">
                    This user hasn't linked any device yet.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <DeviceInfoRow
                    icon={Monitor}
                    label="Device name"
                    value={deviceQuery.data.deviceName ?? "Unknown"}
                  />
                  <DeviceInfoRow
                    icon={Smartphone}
                    label="Device ID"
                    value={deviceQuery.data.deviceId}
                    mono
                  />
                  {deviceQuery.data.userAgent && (
                    <DeviceInfoRow
                      icon={Wifi}
                      label="User agent"
                      value={deviceQuery.data.userAgent}
                      truncate
                    />
                  )}
                  {deviceQuery.data.ipAddress && (
                    <DeviceInfoRow
                      icon={MapPin}
                      label="IP address"
                      value={deviceQuery.data.ipAddress}
                      mono
                    />
                  )}
                </div>
              )}
            </div>

            {deviceQuery.data && (
              <>
                <div className="bg-border mx-[18px] h-px" />
                <div className="mx-auto my-2 p-2.5">
                  <Button
                    onClick={() => {
                      deviceDelete.mutate({ userId: user.id });
                    }}
                    disabled={deviceDelete.isPending}
                    variant={"secondary"}
                    className="cursor-pointer"
                  >
                    <RefreshCcw
                      className={cn(
                        "h-3.5 w-3.5",
                        deviceDelete.isPending && "animate-spin",
                      )}
                    />
                    <p>Reset device</p>
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DeviceInfoRow({
  icon: Icon,
  label,
  value,
  mono,
  truncate,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  mono?: boolean;
  truncate?: boolean;
}) {
  return (
    <div className="flex max-w-[450px] items-start gap-3 rounded-lg px-2 py-2">
      <div className="bg-muted mt-0.5 flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg">
        <Icon className="text-muted-foreground h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground truncate text-[11px]">{label}</p>
        <p
          className={cn(
            "text-[13px] font-medium",
            mono && "font-mono",
            truncate && "truncate",
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function ActionItem({
  icon: Icon,
  iconClassName,
  label,
  description,
  onClick,
  variant,
  loading,
}: {
  icon: React.ElementType;
  iconClassName: string;
  label: string;
  description: string;
  onClick: () => void;
  variant?: "danger";
  loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        "group flex w-full cursor-pointer items-center gap-3 rounded-[9px] px-2.5 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        variant === "danger"
          ? "hover:bg-red-50 dark:hover:bg-red-950/40"
          : "hover:bg-muted",
      )}
    >
      <div
        className={cn(
          "flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg border",
          iconClassName,
        )}
      >
        <Icon className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-[13px] font-medium",
            variant === "danger" && "text-destructive",
          )}
        >
          {label}
        </p>
        <p
          className={cn(
            "text-muted-foreground text-[11px]",
            variant === "danger" && "text-red-400",
          )}
        >
          {description}
        </p>
      </div>
      {variant !== "danger" && !loading && (
        <ArrowRight className="text-muted-foreground/40 h-3.5 w-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
      )}
    </button>
  );
}
