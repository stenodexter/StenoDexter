"use client";

// ─── app/admin/settings/page.tsx ─────────────────────────────────────────────

import { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import {
  Camera,
  Check,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Shield,
  Sparkles,
  Database,
} from "lucide-react";
import { cn } from "~/lib/utils";

// ─── helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── save status ──────────────────────────────────────────────────────────────

function SaveStatus({
  state,
  error,
}: {
  state: "idle" | "saving" | "saved" | "error";
  error?: string;
}) {
  if (state === "idle") return null;
  if (state === "saving")
    return (
      <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Loader2 className="h-3 w-3 animate-spin" /> Saving…
      </span>
    );
  if (state === "saved")
    return (
      <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
        <Check className="h-3 w-3" /> Saved
      </span>
    );
  return (
    <span className="text-destructive flex items-center gap-1.5 text-xs">
      <AlertCircle className="h-3 w-3" /> {error ?? "Something went wrong"}
    </span>
  );
}

// ─── field ────────────────────────────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-muted-foreground block text-[10px] font-semibold tracking-[0.12em] uppercase">
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── card ─────────────────────────────────────────────────────────────────────

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border bg-card rounded-2xl border p-6 shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

function CardHeader({
  icon: Icon,
  title,
  description,
  badge,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <div className="bg-muted ring-border flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1">
        <Icon className="text-muted-foreground h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="text-card-foreground text-sm font-semibold">
            {title}
          </h2>
          {badge && (
            <Badge
              variant="secondary"
              className="h-4 rounded-full px-1.5 text-[10px]"
            >
              {badge}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

// ─── avatar upload ────────────────────────────────────────────────────────────

function AvatarUpload({
  currentUrl,
  name,
  onUploadComplete,
}: {
  currentUrl: string | null;
  name: string;
  onUploadComplete: (key: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const presign = trpc.store.generatePresignedUrl.useMutation();

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setUploadError("Select an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("Max 5MB");
        return;
      }
      setUploadError(null);
      setUploading(true);
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target?.result as string);
      reader.readAsDataURL(file);
      try {
        const ext = file.name.split(".").pop() ?? "jpg";
        const { uploadUrl, key } = await presign.mutateAsync({
          folder: "admin-avatars",
          contentType: file.type,
          ext,
        });
        const res = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
        if (!res.ok) throw new Error("Upload failed");
        onUploadComplete(key);
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : "Upload failed");
        setPreviewUrl(null);
      } finally {
        setUploading(false);
      }
    },
    [presign, onUploadComplete],
  );

  const displayUrl = previewUrl ?? currentUrl ?? undefined;

  return (
    <div className="border-border mb-6 flex items-center gap-4 border-b pb-6">
      <div className="relative shrink-0">
        <Avatar className="ring-border h-14 w-14 ring-2">
          <AvatarImage src={displayUrl} />
          <AvatarFallback className="bg-muted text-muted-foreground text-sm font-bold">
            {initials(name)}
          </AvatarFallback>
        </Avatar>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-all duration-150",
            "hover:opacity-100 focus-visible:opacity-100",
            uploading && "cursor-wait opacity-100",
          )}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin text-white" />
          ) : (
            <Camera className="h-4 w-4 text-white" />
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
      </div>
      <div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-foreground hover:text-muted-foreground text-xs font-medium transition-colors disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "Change photo"}
        </button>
        <p className="text-muted-foreground mt-0.5 text-[11px]">
          JPG, PNG, WebP · max 5MB
        </p>
        {uploadError && (
          <p className="text-destructive mt-1 flex items-center gap-1 text-[11px]">
            <AlertCircle className="h-3 w-3" /> {uploadError}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── profile card ─────────────────────────────────────────────────────────────

function ProfileCard() {
  const utils = trpc.useUtils();
  const { data: me, isLoading } = trpc.admin.auth.me.useQuery();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveError, setSaveError] = useState<string | undefined>();

  useEffect(() => {
    if (!me) return;
    setName(me.name);
    setUsername(me.username);
    setImageKey(me.image ?? null);
  }, [me?.id]);

  const { data: availability } = trpc.admin.checkUsernameAvailability.useQuery(
    { username },
    {
      enabled: username.length >= 3 && username !== me?.username,
      staleTime: 5_000,
    },
  );

  const usernameConflict =
    username !== me?.username && availability?.available === false;

  const edit = trpc.admin.edit.useMutation({
    onMutate: () => setSaveState("saving"),
    onSuccess: () => {
      setSaveState("saved");
      void utils.admin.auth.me.invalidate();
      setTimeout(() => setSaveState("idle"), 3000);
    },
    onError: (e) => {
      setSaveState("error");
      setSaveError(e.message);
    },
  });

  const handleSave = () => {
    if (!me || usernameConflict) return;
    const patch: { name?: string; username?: string; image?: string } = {};
    if (name !== me.name) patch.name = name;
    if (username !== me.username) patch.username = username;
    if (imageKey !== me.image) patch.image = imageKey ?? undefined;
    if (!Object.keys(patch).length) return;
    edit.mutate(patch);
  };

  if (isLoading || !me) {
    return (
      <Card>
        <div className="border-border mb-6 flex animate-pulse items-center gap-4 border-b pb-6">
          <div className="bg-muted h-14 w-14 rounded-full" />
          <div className="space-y-2">
            <div className="bg-muted h-3 w-24 rounded" />
            <div className="bg-muted/60 h-2.5 w-32 rounded" />
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-muted h-9 animate-pulse rounded-lg" />
          <div className="bg-muted h-9 animate-pulse rounded-lg" />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        icon={Sparkles}
        title="Profile"
        description="Name, username, and photo shown across the admin panel."
      />
      <AvatarUpload
        currentUrl={me.profilePicUrl ?? null}
        name={me.name}
        onUploadComplete={(key) => setImageKey(key)}
      />
      <div className="space-y-4">
        <Field label="Display name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="h-9 text-sm"
          />
        </Field>
        <Field label="Username">
          <div className="relative">
            <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm select-none">
              @
            </span>
            <Input
              value={username}
              onChange={(e) =>
                setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))
              }
              placeholder="username"
              className={cn(
                "h-9 pl-7 text-sm",
                usernameConflict &&
                  "border-destructive focus-visible:ring-destructive",
              )}
            />
          </div>
          {usernameConflict && (
            <p className="text-destructive mt-1 flex items-center gap-1 text-[11px]">
              <AlertCircle className="h-3 w-3" /> Username taken
            </p>
          )}
        </Field>
        <div className="flex items-center justify-between pt-2">
          <SaveStatus state={saveState} error={saveError} />
          <Button
            size="sm"
            onClick={handleSave}
            disabled={edit.isPending || usernameConflict}
          >
            Save profile
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ─── password card ────────────────────────────────────────────────────────────

function PasswordCard() {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveError, setSaveError] = useState<string | undefined>();

  const mismatch = confirmPass.length > 0 && newPassword !== confirmPass;
  const tooShort = newPassword.length > 0 && newPassword.length < 6;
  const canSubmit =
    oldPassword && newPassword && confirmPass && !mismatch && !tooShort;

  const edit = trpc.admin.edit.useMutation({
    onMutate: () => setSaveState("saving"),
    onSuccess: () => {
      setSaveState("saved");
      setOldPassword("");
      setNewPassword("");
      setConfirmPass("");
      setTimeout(() => setSaveState("idle"), 3000);
    },
    onError: (e) => {
      setSaveState("error");
      setSaveError(e.message);
    },
  });

  const strength =
    newPassword.length === 0
      ? 0
      : newPassword.length < 6
        ? 1
        : newPassword.length < 10
          ? 2
          : /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword)
            ? 4
            : 3;

  const strengthMeta = [
    null,
    {
      label: "Weak",
      barColor: "bg-red-500",
      textColor: "text-red-600 dark:text-red-400",
    },
    {
      label: "Fair",
      barColor: "bg-amber-500",
      textColor: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Good",
      barColor: "bg-blue-500",
      textColor: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Strong",
      barColor: "bg-emerald-500",
      textColor: "text-emerald-600 dark:text-emerald-400",
    },
  ][strength];

  function PwInput({
    value,
    onChange,
    show,
    onToggle,
    placeholder,
    error,
  }: {
    value: string;
    onChange: (v: string) => void;
    show: boolean;
    onToggle: () => void;
    placeholder: string;
    error?: boolean;
  }) {
    return (
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "h-9 pr-9 text-sm",
            error && "border-destructive focus-visible:ring-destructive",
          )}
        />
        <button
          type="button"
          onClick={onToggle}
          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 transition-colors"
        >
          {show ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader
        icon={Shield}
        title="Password"
        description="Use a strong, unique password you don't use elsewhere."
      />
      <div className="space-y-4">
        <Field label="Current password">
          <PwInput
            value={oldPassword}
            onChange={setOldPassword}
            show={showOld}
            onToggle={() => setShowOld((v) => !v)}
            placeholder="Enter current password"
          />
        </Field>
        <Field label="New password">
          <PwInput
            value={newPassword}
            onChange={setNewPassword}
            show={showNew}
            onToggle={() => setShowNew((v) => !v)}
            placeholder="At least 6 characters"
            error={tooShort}
          />
          {newPassword.length > 0 && strengthMeta && (
            <div className="mt-2 space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-0.5 flex-1 rounded-full transition-all duration-300",
                      i <= strength ? strengthMeta.barColor : "bg-muted",
                    )}
                  />
                ))}
              </div>
              <p
                className={cn(
                  "text-[10px] font-semibold tracking-widest uppercase",
                  strengthMeta.textColor,
                )}
              >
                {strengthMeta.label}
              </p>
            </div>
          )}
          {tooShort && (
            <p className="text-destructive text-[11px]">Minimum 6 characters</p>
          )}
        </Field>
        <Field label="Confirm new password">
          <PwInput
            value={confirmPass}
            onChange={setConfirmPass}
            show={showNew}
            onToggle={() => setShowNew((v) => !v)}
            placeholder="Repeat new password"
            error={mismatch}
          />
          {mismatch && (
            <p className="text-destructive mt-1 text-[11px]">
              Passwords don't match
            </p>
          )}
        </Field>
        <div className="flex items-center justify-between pt-2">
          <SaveStatus state={saveState} error={saveError} />
          <Button
            size="sm"
            onClick={() =>
              canSubmit && edit.mutate({ oldPassword, newPassword })
            }
            disabled={!canSubmit || edit.isPending}
          >
            Update password
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ─── recheck card ─────────────────────────────────────────────────────────────

function RecheckCard() {
  const [ran, setRan] = useState(false);

  const recheck = trpc.attempt.recheckAll.useMutation({
    onSuccess: () => setRan(true),
  });

  const progress = trpc.attempt.recheckAllProgress.useQuery(undefined, {
    refetchInterval: recheck.isPending ? 1500 : false,
    enabled: recheck.isPending || ran,
  });

  const data = progress.data;
  const processed = data ? data.succeeded + data.failed.length : 0;
  const pct = data?.total ? Math.round((processed / data.total) * 100) : 0;

  return (
    <Card>
      <CardHeader
        icon={Database}
        title="Score Engine"
        description="Re-evaluate all submitted attempts against the current scoring algorithm."
        badge="Admin"
      />

      <div className="space-y-4">
        {data && (
          <div className="border-border bg-muted/40 space-y-3 rounded-xl border p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {data.status === "running" ? "Processing…" : "Complete"}
              </span>
              <span className="text-foreground font-mono tabular-nums">
                {processed}
                <span className="text-muted-foreground"> / {data.total}</span>
              </span>
            </div>
            <div className="bg-muted h-1 overflow-hidden rounded-full">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  data.status === "done" ? "bg-emerald-500" : "bg-primary",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="text-emerald-600 dark:text-emerald-400">
                <Check className="mr-0.5 inline h-3 w-3" />
                {data.succeeded} succeeded
              </span>
              {data.failed.length > 0 && (
                <span className="text-destructive">
                  <AlertCircle className="mr-0.5 inline h-3 w-3" />
                  {data.failed.length} failed
                </span>
              )}
              {data.status === "done" && (
                <span className="text-muted-foreground ml-auto">Done</span>
              )}
            </div>
          </div>
        )}

        {data?.failed && data.failed.length > 0 && (
          <div className="border-destructive/20 bg-destructive/5 max-h-32 space-y-1.5 overflow-y-auto rounded-xl border p-3">
            {data.failed.map((f) => (
              <div
                key={f.attemptId}
                className="flex items-start gap-2 text-[11px]"
              >
                <span className="text-muted-foreground shrink-0 font-mono">
                  {f.attemptId}
                </span>
                <ChevronRight className="text-muted-foreground/40 mt-px h-3 w-3 shrink-0" />
                <span className="text-destructive truncate">{f.error}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <p className="text-muted-foreground max-w-[220px] text-[11px] leading-relaxed">
            Re-scores every submitted attempt and updates results + leaderboard.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setRan(false);
              recheck.mutate();
            }}
            disabled={recheck.isPending}
          >
            {recheck.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                Running…
              </>
            ) : (
              <>
                <RefreshCw className="mr-1.5 h-3 w-3" />
                Recheck all
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  return (
    <div>
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <div className="mb-8">
          <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-[0.16em] uppercase">
            Admin
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Account, security, and system controls.
          </p>
        </div>

        <div className="space-y-4">
          <ProfileCard />
          <PasswordCard />
          <RecheckCard />
        </div>
      </div>
    </div>
  );
}
