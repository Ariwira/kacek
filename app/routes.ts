import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  // Auth (public)
  layout("routes/_auth.tsx", [
    route("login", "routes/_auth.login.tsx"),
    route("register", "routes/_auth.register.tsx"),
  ]),

  // App (protected)
  layout("routes/_app.tsx", [
    index("routes/_app.dashboard.tsx"),
    route("transaksi", "routes/_app.transaksi.tsx"),
    route("anggaran", "routes/_app.anggaran.tsx"),
    route("laporan", "routes/_app.laporan.tsx"),
    route("tujuan", "routes/_app.tujuan.tsx"),
    route("profil", "routes/_app.profil.tsx"),
  ]),

  // Resource / action routes
  route("action/theme", "routes/action.theme.tsx"),
  route("action/export", "routes/action.export.tsx"),
  route("action/transaction", "routes/action.transaction.tsx"),
  route("action/transaction/:id/update", "routes/action.transaction.update.tsx"),
  route("action/transaction/:id/delete", "routes/action.transaction.delete.tsx"),
  route("action/recurring/:id/update", "routes/action.recurring.$id.update.tsx"),
  route("action/recurring/:id/delete", "routes/action.recurring.$id.delete.tsx"),
  route("action/budget", "routes/action.budget.tsx"),
  route("action/goal", "routes/action.goal.tsx"),
  route("action/goal/:id/delete", "routes/action.goal.delete.tsx"),
  route("action/goal/:id/contribute", "routes/action.goal.contribute.tsx"),
  route("action/goal/:id/complete", "routes/action.goal.complete.tsx"),
  route("action/logout", "routes/action.logout.tsx"),
  route("action/notification/read", "routes/action.notification.read.tsx"),
  route("action/category", "routes/action.category.tsx"),
  route("action/transfer", "routes/action.transfer.tsx"),
] satisfies RouteConfig;
