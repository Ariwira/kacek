import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { getTheme } from "~/lib/theme.server";
import { type Theme } from "~/components/theme";
import { ToastProvider } from "~/components/toast";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap",
  },
];

export const meta: Route.MetaFunction = () => [
  { title: "KaCek — Lacak pengeluaranmu dengan elegan" },
  {
    name: "description",
    content:
      "KaCek adalah expense tracker premium dengan glassmorphism, light/dark mode, dan analitik kategori.",
  },
];

export async function loader({ request }: Route.LoaderArgs) {
  const theme = await getTheme(request);
  return { theme };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useLoaderData<typeof loader>();
  const theme: Theme = data?.theme ?? "dark";
  return (
    <html lang="id" data-theme={theme}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-brand-bg text-brand-text min-h-screen font-sans antialiased">
        <ToastProvider>
          {children}
          <ScrollRestoration />
          <Scripts />
        </ToastProvider>
      </body>
    </html>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Outlet />
    </ToastProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "Terjadi kesalahan tak terduga.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "Halaman yang kamu cari tidak ditemukan."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="p-8 max-w-[720px] mx-auto mt-15 font-sans">
      <h1 className="text-[32px] font-bold mb-3 text-brand-text">
        {message}
      </h1>
      <p className="text-brand-text-dim">{details}</p>
      {stack && (
        <pre className="mt-4 p-3.5 bg-brand-surface-2 rounded-lg overflow-x-auto text-xs text-brand-text-mute border border-brand-hairline">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
