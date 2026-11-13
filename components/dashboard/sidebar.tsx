"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { primaryNav, secondaryNav, type NavItem } from "@/components/dashboard/nav-data";
import { cn } from "@/lib/utils";

export function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-sidebar-active text-foreground font-medium"
          : "text-muted hover:bg-surface-muted hover:text-foreground",
      )}
    >
      <Icon className={cn("size-4 shrink-0", active ? "text-primary" : "text-subtle")} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function SidebarNav({
  allowed,
  onNavigate,
}: {
  allowed?: string[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);
  const show = (href: string) => !allowed || allowed.includes(href);
  const primary = primaryNav.filter((i) => show(i.href));
  const secondary = secondaryNav.filter((i) => show(i.href));
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
      {primary.map((item) => (
        <NavLink key={item.href} item={item} active={isActive(item.href)} onNavigate={onNavigate} />
      ))}
      {secondary.length > 0 && <div className="border-border my-3 border-t" />}
      {secondary.map((item) => (
        <NavLink key={item.href} item={item} active={isActive(item.href)} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}

export function SidebarBrand() {
  return (
    <div className="flex items-center gap-2 px-5 py-5">
      <Logo markClassName="size-6" className="text-base" />
      <span className="bg-accent-soft text-accent-strong ring-accent/20 ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ring-1">
        Portal
      </span>
    </div>
  );
}

/** Desktop sidebar (lg+). Mobile uses the drawer in MobileNav. */
export function Sidebar({ allowed }: { allowed?: string[] }) {
  return (
    <aside className="border-border bg-sidebar hidden w-64 shrink-0 flex-col border-r lg:flex">
      <SidebarBrand />
      <SidebarNav allowed={allowed} />
    </aside>
  );
}
