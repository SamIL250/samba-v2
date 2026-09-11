import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: "var(--samba-gradient)" }}
    >
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" forceRedirectUrl="/home" />
    </div>
  );
}
