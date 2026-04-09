"use client";

// ─── app/user/settings/page.tsx ───────────────────────────────────────────────
//
// Profile: name, phone, gender, avatar (R2 via store.generatePresignedUrl)
// Password: better-auth authClient.changePassword — no custom endpoint needed

import { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Camera,
  Check,
  Loader2,
  Eye,
  EyeOff,
  User,
  Lock,
  AlertCircle,
  Phone,
  CheckCircle2,
  Hash,
  IdCard,
  CalendarClock,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { authClient } from "~/server/better-auth/client";
import type { AuthUser } from "~/server/better-auth/config";
import { Badge } from "~/components/ui/badge";
import { format } from "date-fns";

// ─── helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-[220px_1fr]">
      <div>
        <div className="flex items-center gap-2">
          <Icon className="text-muted-foreground h-4 w-4" />
          <h2 className="text-sm font-semibold">{title}</h2>
        </div>
        <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
          {description}
        </p>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
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
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Saving…
      </span>
    );
  if (state === "saved")
    return (
      <span className="flex items-center gap-1.5 text-xs text-emerald-500">
        <Check className="h-3.5 w-3.5" />
        Saved
      </span>
    );
  return (
    <span className="text-destructive flex items-center gap-1.5 text-xs">
      <AlertCircle className="h-3.5 w-3.5" />
      {error ?? "Something went wrong"}
    </span>
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
        setUploadError("Please select an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("Image must be under 5MB");
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
          folder: "user-avatars",
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
    <div className="flex items-center gap-5">
      <div className="relative">
        <Avatar className="h-16 w-16">
          <AvatarImage src={displayUrl} />
          <AvatarFallback className="text-lg font-bold">
            {initials(name || "?")}
          </AvatarFallback>
        </Avatar>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity",
            "hover:opacity-100 focus-visible:opacity-100",
            uploading && "cursor-wait opacity-100",
          )}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          ) : (
            <Camera className="h-5 w-5 text-white" />
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
      <div className="space-y-1">
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Uploading…" : "Change photo"}
        </Button>
        <p className="text-muted-foreground text-xs">
          JPG, PNG or WebP · max 5MB
        </p>
        {uploadError && (
          <p className="text-destructive flex items-center gap-1 text-xs">
            <AlertCircle className="h-3 w-3" />
            {uploadError}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── profile section ──────────────────────────────────────────────────────────

function ProfileSection() {
  const utils = trpc.useUtils();
  const { data: me, isLoading } = trpc.user.me.useQuery();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<string>("none");
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveError, setSaveError] = useState<string | undefined>();

  // Seed form from me on first load
  useEffect(() => {
    if (!me) return;
    setName(me.name ?? "");
    setPhone(me.phone ?? "");
    setGender(me.gender ?? "none");
    setImageKey(me.image ?? null);
  }, [me?.id]);

  const edit = trpc.user.edit.useMutation({
    onMutate: () => setSaveState("saving"),
    onSuccess: () => {
      setSaveState("saved");
      void utils.user.me.invalidate();
      setTimeout(() => setSaveState("idle"), 3000);
    },
    onError: (e) => {
      setSaveState("error");
      setSaveError(e.message);
    },
  });

  const handleSave = () => {
    if (!me) return;
    const patch: {
      name?: string;
      phone?: string;
      gender?: string;
      image?: string;
    } = {};
    if (name !== (me.name ?? "")) patch.name = name;
    if (phone !== (me.phone ?? "")) patch.phone = phone;
    if (gender !== (me.gender ?? "none"))
      patch.gender = gender === "none" ? "" : gender;
    if (imageKey !== (me.image ?? null)) patch.image = imageKey ?? undefined;
    if (!Object.keys(patch).length) return;
    edit.mutate(patch);
  };

  if (isLoading || !me) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-5">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  // profilePicUrl is resolved by the server — use it directly as the display URL
  const profilePicUrl = me.image ? ((me as any).profilePicUrl ?? null) : null;

  return (
    <div className="space-y-4">
      <AvatarUpload
        currentUrl={profilePicUrl}
        name={me.name ?? ""}
        onUploadComplete={(key) => setImageKey(key)}
      />

      <div className="space-y-1.5">
        <label className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Full name
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Email
        </label>
        <Input
          value={me.email}
          disabled
          className="text-muted-foreground text-sm"
        />
        <p className="text-muted-foreground text-xs">
          Email cannot be changed here.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          <span className="mb-1 flex items-center gap-1.5">
            <Phone className="h-3 w-3" />
            Phone
          </span>
        </label>
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+91 98765 43210"
          className="text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
          Gender
        </label>
        <Select value={gender} onValueChange={setGender}>
          <SelectTrigger className="text-sm">
            <SelectValue placeholder="Prefer not to say" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="other">Other</SelectItem>
            <SelectItem value="none">Prefer not to say</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between pt-1">
        <SaveStatus state={saveState} error={saveError} />
        <Button size="sm" onClick={handleSave} disabled={edit.isPending}>
          Save profile
        </Button>
      </div>
    </div>
  );
}

// ─── password section — uses better-auth authClient.changePassword ────────────

export function PasswordSection({ email }: { email: string }) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendReset = async () => {
    setLoading(true);
    setError(null);

    try {
      await authClient.requestPasswordReset({
        email,
        redirectTo: "/user/reset-password",
      });

      setSent(true);
    } catch {
      setError("Failed to send reset link. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold">Password</h2>
        <p className="text-muted-foreground text-sm">
          Send yourself a secure link to reset your password.
        </p>
      </div>

      {/* Email display */}
      <div className="bg-muted/50 rounded-md px-3 py-2 text-sm">{email}</div>

      {/* Error */}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Success state */}
      {sent ? (
        <div className="flex flex-col items-start gap-3">
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Reset link sent to your email
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={sendReset}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Resend link
          </Button>
        </div>
      ) : (
        <Button onClick={sendReset} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
          Send reset link
        </Button>
      )}
    </div>
  );
}

type SubStatus = {
  active: boolean;
  expiresAt?: string | null;
  isRevoked?: boolean;
  isDemo: boolean;
};

export function UserIdentity({
  userCode,
  sub,
}: {
  userCode: string;
  sub: SubStatus;
}) {
  const expires = sub.expiresAt ? new Date(sub.expiresAt) : null;

  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      {/* Left */}
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 rounded-sm p-2">
          <IdCard className="text-primary h-5 w-5" />
        </div>

        <div className="flex flex-col leading-tight">
          <span className="text-muted-foreground text-[11px] tracking-wide uppercase">
            Student ID
          </span>
          <span className="text-lg font-semibold tracking-tight">
            {userCode}
          </span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Demo badge */}
        {sub.isDemo && (
          <Badge variant="secondary" className="text-xs">
            Demo
          </Badge>
        )}

        {/* Status badge */}
        {sub.isRevoked ? (
          <Badge variant="destructive" className="text-xs">
            Revoked
          </Badge>
        ) : sub.active ? (
          expires && (
            <Badge variant="outline" className="text-xs">
              {`Valid till ${format(expires, "do MMM YYY")}`}
            </Badge>
          )
        ) : (
          <Badge variant="destructive" className="text-xs">
            Inactive
          </Badge>
        )}
      </div>
    </div>
  );
}

export default function UserSettingsPage({
  providers,
  user,
  sub,
}: {
  providers: string[];
  user: AuthUser;
  sub: SubStatus;
}) {
  const isExpired =
    user.isDemo &&
    user.demoExpiresAt &&
    new Date(user.demoExpiresAt) < new Date();

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-8">
      <div className="mb-8">
        {user.userCode && (
          <UserIdentity sub={sub} userCode={user.userCode} key={"user-id"} />
        )}
        <Separator className="my-4" />
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Update your profile and account security.
        </p>
      </div>

      <div className="space-y-10">
        <Section
          icon={User}
          title="Profile"
          description="Your name, contact info, and profile photo."
        >
          <ProfileSection />
        </Section>

        <Separator />

        {!user.isDemo && (
          <Section
            icon={Lock}
            title="Password"
            description="Change your password. Other active sessions will be signed out."
          >
            <PasswordSection email={user.email} />
          </Section>
        )}
      </div>
    </div>
  );
}
