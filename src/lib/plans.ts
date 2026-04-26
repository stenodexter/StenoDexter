export type PlanId = "app" | "typing" | "full";

export interface Plan {
  id: PlanId;
  label: string;
  amount: number;
  duration: string;
  description: string;
  features: string[];
  badge?: string;
  accent: string;
}

export const PLANS: Record<PlanId, Plan> = {
  app: {
    id: "app",
    label: "App",
    amount: 1500,
    duration: "31 days",
    description: "Full app access, everything except typing tests.",
    features: ["Complete app access", "All core features", "31 days validity"],
    accent: "blue",
  },
  typing: {
    id: "typing",
    label: "Typing Tests",
    amount: 500,
    duration: "31 days",
    description: "Typing test feature only.",
    features: ["Typing test feature", "All test modes", "31 days validity"],
    accent: "violet",
  },
  full: {
    id: "full",
    label: "Complete",
    amount: 2000,
    duration: "31 days",
    description: "Everything — app + typing tests. Best value.",
    features: [
      "Full app access",
      "Typing test feature",
      "31 days validity",
      "Best value",
    ],
    badge: "Best Value",
    accent: "emerald",
  },
};

export const PLAN_IDS = Object.keys(PLANS) as PlanId[];
