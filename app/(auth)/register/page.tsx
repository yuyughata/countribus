import Link from "next/link";

import { AuthForm } from "@/components/auth/auth-form";
import { registerAction } from "@/features/auth/actions";

export const metadata = { title: "Create account" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const referral = (ref ?? "").trim().toUpperCase().slice(0, 32);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-foreground text-2xl font-semibold tracking-tight">
          Create your account
        </h1>
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
          {
            name: "referralCode",
            label: "Referral code (optional)",
            required: false,
            defaultValue: referral,
            placeholder: "Have a friend's code?",
            hint: "Enter a friend's code and they'll earn a reward on your first trip.",
          },
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
