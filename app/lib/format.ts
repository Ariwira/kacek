export const formatIDR = (n: number, opts?: { compact?: boolean }) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: opts?.compact ? 2 : 0,
    notation: opts?.compact ? "compact" : "standard",
  }).format(n);

export const formatIDRPlain = (n: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n);

export const formatDate = (d: Date | string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(d));

export const formatRelativeDay = (d: Date | string) => {
  const date = new Date(d);
  const now = new Date();
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round(
    (startOfDay(now) - startOfDay(date)) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return "Hari ini";
  if (diffDays === 1) return "Kemarin";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
  }).format(date);
};

export const monthNameID = (d: Date = new Date()) =>
  new Intl.DateTimeFormat("id-ID", { month: "long" }).format(d);
