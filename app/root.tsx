import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useNavigation,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import { getTheme } from "~/lib/theme.server";
import { type Theme } from "~/components/theme";
import { ToastProvider } from "~/components/toast";
import { useEffect, useState } from "react";

export const links: Route.LinksFunction = () => [
  { rel: "manifest", href: "/manifest.json" },
  { rel: "apple-touch-icon", href: "/icon.svg" },
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
  { name: "theme-color", content: "#06180F" },
  { name: "apple-mobile-web-app-capable", content: "yes" },
  { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
];

export async function loader({ request }: Route.LoaderArgs) {
  const theme = await getTheme(request);
  return { theme };
}

function GlobalLoading() {
  const navigation = useNavigation();
  const active = navigation.state !== "idle";
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (active) {
      setProgress(0);
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 100);
    } else {
      setProgress(100);
      timer = setTimeout(() => setProgress(0), 300);
    }
    return () => {
      clearInterval(timer);
      clearTimeout(timer);
    };
  }, [active]);

  if (!active && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[10000] pointer-events-none">
      <div 
        className="h-[3px] bg-gradient-to-r from-brand-accent to-brand-violet transition-all duration-300 ease-out shadow-[0_0_8px_var(--accent)]"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useLoaderData<typeof loader>();
  const theme: Theme = data?.theme ?? "dark";
  return (
    <html lang="id" data-theme={theme}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <Meta />
        <Links />
      </head>
      <body className="bg-brand-bg text-brand-text min-h-screen font-sans antialiased overflow-x-hidden">
        <ToastProvider>
          <GlobalLoading />
          {children}
          <ScrollRestoration />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', () => {
                    navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed: ', err));
                  });
                }
              `,
            }}
          />
          <Scripts />
        </ToastProvider>
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
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
