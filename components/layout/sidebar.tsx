"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gem, X } from "lucide-react";

import { NAV_ITEMS } from "@/components/layout/nav";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <aside className={`sidebar${open ? " open" : ""}`} aria-label="Main navigation">
        <div className="brand">
          <div className="brand-mark"><Gem size={21} /></div>
          <div>
            <strong>Aurum</strong>
            <span>Market Intelligence</span>
          </div>
          <button className="sidebar-close" type="button" aria-label="Close menu" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <nav className="nav-list">
          <p className="nav-heading">Workspace</p>
          {NAV_ITEMS.map(({ label, href, icon: Icon }) =>
            href ? (
              <Link
                key={label}
                href={href}
                className={`nav-item${pathname === href ? " active" : ""}`}
                aria-current={pathname === href ? "page" : undefined}
                onClick={onClose}
              >
                <Icon size={18} strokeWidth={1.8} />
                <span>{label}</span>
              </Link>
            ) : (
              <span
                key={label}
                className="nav-item disabled"
                aria-disabled="true"
                title={`${label} is coming soon`}
              >
                <Icon size={18} strokeWidth={1.8} />
                <span>{label}</span>
                <small>Soon</small>
              </span>
            ),
          )}
        </nav>

        <div className="sidebar-bottom">
          <div className="profile">
            <div className="avatar">AV</div>
            <div><strong>Anurag</strong><span>Developer</span></div>
          </div>
        </div>
      </aside>
      {open && <div className="sidebar-backdrop" onClick={onClose} aria-hidden="true" />}
    </>
  );
}
