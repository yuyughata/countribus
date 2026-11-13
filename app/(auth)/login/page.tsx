import Link from "next/link";

import { AuthForm } from "@/components/auth/auth-form";
import { loginAction } from "@/features/auth/actions";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-foreground text-lg font-semibold">Welcome back</h1>
        <p className="text-muted text-sm">Sign in to your Countribus account.</p>
      </div>
      <AuthForm
        action={loginAction}
        submitLabel="Sign in"
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          {
            name: "password",
            label: "Password",
            type: "password",
            autoComplete: "current-password",
          },
        ]}
      />
      <p className="text-muted text-center text-sm">
        New operator or traveller?{" "}
        <Link href="/register" className="text-primary font-medium">
          Create an account
        </Link>
      </p>
    </div>
  );
}
