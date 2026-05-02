import { Form, Link, useActionData, useOutletContext } from "react-router";
import { z } from "zod";
import type { Route } from "./+types/_auth.register";
import type { Theme } from "~/components/theme";
import { STR } from "~/lib/i18n";
import { createUserSession, register } from "~/lib/auth.server";

const schema = z.object({
  name: z.string().min(1, "Nama wajib diisi.").max(80),
  email: z.string().email("Email tidak valid."),
  password: z.string().min(8, "Password minimal 8 karakter."),
});

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const parsed = schema.safeParse({
    name: form.get("name"),
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Input tidak valid." };
  }
  const result = await register(parsed.data);
  if ("error" in result) return { error: result.error };
  return createUserSession(result.userId, "/");
}

export default function RegisterPage() {
  const { theme } = useOutletContext<{ theme: Theme }>();
  const dark = theme === "dark";
  const data = useActionData<typeof action>();

  return (
    <div>
      <h1 className="text-[22px] font-bold tracking-tight text-brand-text m-0 mb-1.5">
        {STR.registerCta}
      </h1>
      <p className="text-[13px] text-brand-text-dim m-0 mb-5.5">
        {STR.registerSubtitle}
      </p>

      <Form method="post" className="flex flex-col gap-3.5">
        <FormField label={STR.name}>
          <input
            name="name"
            type="text"
            autoComplete="name"
            required
            placeholder="Nama lengkap"
            className="h-11 px-3.5 rounded-xl bg-brand-input border border-brand-hairline text-brand-text text-sm font-medium outline-none font-sans w-full"
          />
        </FormField>
        <FormField label={STR.email}>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="kamu@email.com"
            className="h-11 px-3.5 rounded-xl bg-brand-input border border-brand-hairline text-brand-text text-sm font-medium outline-none font-sans w-full"
          />
        </FormField>
        <FormField label={STR.password}>
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="Minimal 8 karakter"
            className="h-11 px-3.5 rounded-xl bg-brand-input border border-brand-hairline text-brand-text text-sm font-medium outline-none font-sans w-full"
          />
        </FormField>

        {data?.error && (
          <div className="text-xs text-brand-red bg-brand-red-soft px-3 py-2.5 rounded-xl border border-brand-red/20 font-medium">
            {data.error}
          </div>
        )}

        <button
          type="submit"
          className={`mt-2 px-4.5 py-3.5 rounded-2xl border-none cursor-pointer font-bold text-sm tracking-wide font-sans flex items-center justify-center gap-2 bg-gradient-to-br from-brand-accent to-brand-violet min-h-[44px] ${
            dark
              ? "text-[#06180F] shadow-[0_10px_24px_rgba(52,245,160,0.33)]"
              : "text-white shadow-[0_10px_24px_rgba(14,159,110,0.27)]"
          }`}
        >
          {STR.register}
          <span className="ml-2 px-1.5 border border-black/20 rounded-md font-mono text-[10px]">
            ↵
          </span>
        </button>
      </Form>

      <div className="mt-4.5 text-center text-[13px] text-brand-text-dim">
        {STR.haveAccount}{" "}
        <Link
          to="/login"
          className="text-brand-accent font-bold no-underline hover:underline"
        >
          {STR.login}
        </Link>
      </div>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10.5px] tracking-wider uppercase text-brand-text-mute font-bold">
        {label}
      </span>
      {children}
    </label>
  );
}
