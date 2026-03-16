"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Store, Trophy, MessageSquare, Server, BookOpen } from "lucide-react";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/players", label: "Players", icon: Users },
  { href: "/market", label: "Market", icon: Store },
  { href: "/leaderboards", label: "Leaderboards", icon: Trophy },
  { href: "/servers", label: "Servers", icon: Server },
  { href: "/feedback", label: "Feedback", icon: MessageSquare },
  { href: "/economy.html", label: "Economy", icon: BookOpen, external: true },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-[#2d2640] bg-[#0a0a0f]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-8 px-6 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/images/treasure_hunt_logo.png"
            alt="Treasure Hunt"
            width={140}
            height={48}
            className="h-10 w-auto"
            priority
          />
        </Link>
        <div className="flex gap-1">
          {links.map((l) => {
            const isExternal = "external" in l && l.external;
            const isActive =
              !isExternal && (pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href)));
            const Icon = l.icon;
            const cls = `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
              isActive
                ? "bg-amber-500/15 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                : "text-[#9892a6] hover:bg-[#1a1625] hover:text-[#e4e0ed]"
            }`;
            if (isExternal) {
              return (
                <a key={l.href} href={l.href} className={cls} aria-hidden="true">
                  <Icon className="h-4 w-4" />
                  {l.label}
                </a>
              );
            }
            return (
              <Link key={l.href} href={l.href} className={cls}>
                <Icon className="h-4 w-4" aria-hidden="true" />
                {l.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
