import { redirect } from "next/navigation";
import { api } from "~/trpc/server";

async function guard<T>(fn: () => Promise<T>, redirectTo: string): Promise<T> {
  try {
    return await fn();
  } catch {
    redirect(redirectTo);
  }
}

export async function requireAdmin() {
  return guard(() => api.admin.auth.me(), "/admin/login");
}

export async function requireUser() {
  return guard(() => api.user.me(), "/user/login");
}


export async function requireSuperAdmin() {
  const admin = await requireAdmin();

  if (!admin.isSuper) {
    redirect("/admin");
  }

  return admin;
}

export async function requirePaidUser() {
  const user = await requireUser();

  // @TODO: check if user has an active subscription
  if (!user) {
    redirect("/pricing");
  }

  return user;
}
