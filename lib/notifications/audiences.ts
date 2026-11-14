export type AudienceKey = "customers" | "vendor_managers" | "all_staff" | "team" | "everyone";

export const AUDIENCES: { key: AudienceKey; label: string; hint: string }[] = [
  { key: "customers", label: "Customers", hint: "Everyone who books trips" },
  { key: "vendor_managers", label: "Operator managers", hint: "Partner owners & managers" },
  {
    key: "all_staff",
    label: "All operator staff",
    hint: "Owners, managers, officers, terminal staff",
  },
  { key: "team", label: "Countribus team", hint: "Admins & support" },
  { key: "everyone", label: "Everyone", hint: "All of the above" },
];
