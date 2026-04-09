"use client";

import { Monitor, ShieldCheck, CreditCard } from "lucide-react";
import { cn } from "~/lib/utils";

type Variant = "register" | "login" | "payment";
type Size = "sm" | "md" | "lg";

export function DeviceNotice({
  variant,
  size = "md",
  className,
}: {
  variant: Variant;
  size?: Size;
  className?: string;
}) {
  const isRegister = variant === "register";
  const isLogin = variant === "login";

  const styles = {
    container: isRegister
      ? "border-amber-500/25 bg-amber-500/5"
      : isLogin
        ? "border-sky-500/25 bg-sky-500/5"
        : "border-rose-500/25 bg-rose-500/5",

    glow: isRegister ? "bg-amber-400" : isLogin ? "bg-sky-400" : "bg-rose-400",

    iconWrap: isRegister
      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
      : isLogin
        ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
        : "bg-rose-500/15 text-rose-600 dark:text-rose-400",

    title: isRegister
      ? "text-amber-700 dark:text-amber-300"
      : isLogin
        ? "text-sky-700 dark:text-sky-300"
        : "text-rose-700 dark:text-rose-300",
  };

  const sizes = {
    sm: {
      container: "px-3 py-2.5 rounded-lg",
      icon: "h-6 w-6",
      iconInner: "h-3 w-3",
      title: "text-[11px]",
      desc: "text-[10px]",
      gap: "gap-2",
    },
    md: {
      container: "px-4 py-3.5 rounded-xl",
      icon: "h-7 w-7",
      iconInner: "h-3.5 w-3.5",
      title: "text-xs",
      desc: "text-[11px]",
      gap: "gap-3",
    },
    lg: {
      container: "px-5 py-4 rounded-2xl",
      icon: "h-8 w-8",
      iconInner: "h-4 w-4",
      title: "text-sm",
      desc: "text-xs",
      gap: "gap-3.5",
    },
  };

  const content = {
    register: {
      icon: Monitor,
      title: " Device will be locked after registration",
      description: (
        <>
          Once registered, your account is linked to this device. Switching
          devices later requires manual support.
        </>
      ),
    },
    login: {
      icon: ShieldCheck,
      title: "  Primary device verification",
      description: (
        <>
          You’re signing in on your primary device. Other devices won’t be able
          to access this account
        </>
      ),
    },
    payment: {
      icon: CreditCard,
      title: "Confirm this is your device",
      description: (
        <>
          Payments are restricted to your{" "}
          <span className="text-foreground font-medium">registered device</span>
          . You won’t be able to switch devices later without{" "}
          <span className="text-foreground font-medium">
            technical assistance
          </span>
          .
        </>
      ),
    },
  };

  const current = content[variant];
  const Icon = current.icon;
  const sz = sizes[size];

  return (
    <div
      className={cn(
        "relative overflow-hidden border",
        styles.container,
        sz.container,
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-4 -right-4 h-16 w-16 rounded-full opacity-40 blur-2xl",
          styles.glow,
        )}
      />

      <div className={cn("relative flex items-start", sz.gap)}>
        {/* Icon */}
        <div
          className={cn(
            "mt-0.5 flex shrink-0 items-center justify-center rounded-lg",
            styles.iconWrap,
            sz.icon,
          )}
        >
          <Icon className={sz.iconInner} />
        </div>

        {/* Text */}
        <div className="min-w-0 space-y-0.5">
          <p
            className={cn("leading-snug font-semibold", styles.title, sz.title)}
          >
            {current.title}
          </p>
          <p className={cn("text-muted-foreground leading-relaxed", sz.desc)}>
            {current.description}
          </p>
        </div>
      </div>
    </div>
  );
}
