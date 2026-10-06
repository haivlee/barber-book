import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { logout } from "@/app/admin/actions";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export function AdminHeader() {
  return (
    <header className="sticky top-0 z-30 bg-[oklch(0.18_0.012_60)] text-[oklch(0.97_0.01_85)]">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo href="/admin" />
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            asChild
            variant="ghost"
            size="lg"
            className="hidden text-inherit hover:bg-white/10 hover:text-inherit sm:inline-flex"
          >
            <Link href="/" target="_blank">
              View site <ExternalLink />
            </Link>
          </Button>
          <form action={logout}>
            <Button
              type="submit"
              variant="ghost"
              size="lg"
              className="text-inherit hover:bg-white/10 hover:text-inherit"
            >
              <LogOut /> <span className="hidden sm:inline">Sign out</span>
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
