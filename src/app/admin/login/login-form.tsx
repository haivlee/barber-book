"use client";

import { Loader2 } from "lucide-react";
import { useActionState } from "react";
import { login, type LoginState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={action} className="mt-6 grid gap-4">
      <input type="hidden" name="next" value={next ?? "/admin"} />
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          className="h-11"
          aria-invalid={!!state.error}
        />
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      </div>
      <Button type="submit" size="xl" disabled={pending}>
        {pending && <Loader2 className="animate-spin" data-icon="inline-start" />}
        Sign in
      </Button>
    </form>
  );
}
