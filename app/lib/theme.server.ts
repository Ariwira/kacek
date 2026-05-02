import { createCookie } from "react-router";
import type { Theme } from "~/components/theme";

const themeCookie = createCookie("theme", {
  path: "/",
  httpOnly: false,
  sameSite: "lax",
  maxAge: 60 * 60 * 24 * 365,
});

export async function getTheme(request: Request): Promise<Theme> {
  const value = (await themeCookie.parse(request.headers.get("Cookie"))) as
    | Theme
    | null;
  return value === "light" ? "light" : "dark";
}

export async function setThemeHeader(theme: Theme) {
  const cookieValue = await themeCookie.serialize(theme);
  return { "Set-Cookie": cookieValue };
}
