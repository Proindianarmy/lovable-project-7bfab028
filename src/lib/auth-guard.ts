import { redirect } from "@tanstack/react-router";

export function requireAuth() {
  if (typeof window !== "undefined" && localStorage.getItem("isLoggedIn") !== "true") {
    throw redirect({ to: "/auth", search: { blocked: "1" } });
  }
}
