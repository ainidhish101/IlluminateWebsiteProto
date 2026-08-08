import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("about", "routes/about.tsx"),
  route("get-involved", "routes/get-involved.tsx"),
  route("resources", "routes/resources.tsx"),
  route("gpa-tool", "routes/gpa-tool.tsx"),
  route("account", "routes/account.tsx"),
  route("saved", "routes/saved.tsx"),

  // The dashboard shell owns the sidebar, the header, and the auth gate; every
  // tab below it renders into its <Outlet>. Tabs above Member also wrap
  // themselves in <RequireRole>, which is what catches a typed-in URL.
  route("dashboard", "routes/dashboard.tsx", [
    index("routes/dashboard/index.tsx"),
    route("academics", "routes/dashboard/academics.tsx"),
    route("transcripts", "routes/dashboard/transcripts.tsx"),
    route("activities", "routes/dashboard/activities.tsx"),
    route("resources", "routes/dashboard/resources.tsx"),
    route("goals", "routes/dashboard/goals.tsx"),
    route("calendar", "routes/dashboard/calendar.tsx"),
    route("submit", "routes/dashboard/submit.tsx"),
    route("tasks", "routes/dashboard/tasks.tsx"),
    route("hours", "routes/dashboard/hours.tsx"),
    route("workstation", "routes/dashboard/workstation.tsx"),
    route("users", "routes/dashboard/users.tsx"),
    route("approvals", "routes/dashboard/approvals.tsx"),
    route("assign", "routes/dashboard/assign.tsx"),
    route("activity", "routes/dashboard/activity.tsx"),
    route("settings", "routes/dashboard/settings.tsx"),
  ]),

  // Catch-alls stay last so /dashboard/* never falls through to them.
  route(":category", "routes/category.tsx"),
  route(":category/:field", "routes/field.tsx"),
] satisfies RouteConfig;
