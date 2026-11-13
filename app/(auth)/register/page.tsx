import Link from "next/link";

import { AuthForm } from "@/components/auth/auth-form";
import { registerAction } from "@/features/auth/actions";

export const metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-foreground text-lg font-semibold">Create your account</h1>
        <p className="text-muted text-sm">Book journeys or onboard your transport business.</p>
      </div>
      <AuthForm
        action={registerAction}
        submitLabel="Create account"
        fields={[
          { name: "fullName", label: "Full name", autoComplete: "name" },
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          {
            name: "phone",
            label: "Phone",
            type: "tel",
            autoComplete: "tel",
            placeholder: "0803 000 0000",
          },
          { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
        ]}
      />
      <p className="text-muted text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-primary font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
