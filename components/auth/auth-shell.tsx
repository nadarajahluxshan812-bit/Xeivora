"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

type AuthShellProps = {
  children: ReactNode;
  eyebrow: string;
  title: string;
  subtitle: string;
};

type AuthFormProps = {
  mode: "login" | "signup" | "forgot-password" | "reset-password";
  nextPath?: string;
  initialError?: string | null;
  resetToken?: string | null;
};

type AuthState = {
  error: string | null;
  loading: boolean;
  success: string | null;
};

const authHighlights = [
  {
    title: "Continuous workspace",
    detail: "Resume the same reasoning, memory, files, and workflows across every session.",
    icon: Workflow
  },
  {
    title: "Protected intelligence layer",
    detail: "Your provider routing, memory lanes, and files stay secured behind a durable session.",
    icon: ShieldCheck
  },
  {
    title: "Orchestrated by default",
    detail: "OpenAI, Claude, Gemini, tools, and continuity operate as one surface.",
    icon: Sparkles
  }
];

const authBg = "#0e0b08";
const authPanel = "#120e0a";
const authCard = "#1a1410";
const authBorder = "rgba(201,100,66,0.15)";
const authBorderStrong = "rgba(201,100,66,0.3)";
const authText = "#f0ead8";
const authMuted = "rgba(240,234,216,0.6)";
const authCoral = "#c96442";

export function AuthShell({ children, eyebrow, title, subtitle }: AuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden text-white" style={{ backgroundColor: authBg }}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(201,100,66,0.16),transparent_30%),radial-gradient(circle_at_18%_18%,rgba(201,100,66,0.07),transparent_18%),radial-gradient(circle_at_82%_14%,rgba(240,234,216,0.04),transparent_20%),linear-gradient(180deg,#0e0b08_0%,#120e0a_48%,#0e0b08_100%)]" />
        <div className="absolute left-1/2 top-[-20%] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full blur-[120px]" style={{ backgroundColor: "rgba(201,100,66,0.12)" }} />
        <div className="absolute bottom-[-8rem] right-[-4rem] h-[20rem] w-[20rem] rounded-full blur-[120px]" style={{ backgroundColor: "rgba(201,100,66,0.06)" }} />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1280px] flex-col px-6 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between rounded-full border px-5 py-3 backdrop-blur" style={{ borderColor: authBorder, backgroundColor: "rgba(26,20,16,0.72)" }}>
          <Link className="flex items-center gap-3" href="/">
            <span className="text-[15px] font-medium tracking-[0.02em]" style={{ color: authText }}>
              Xei<span className="italic" style={{ color: authCoral }}>vora</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link className="inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm transition hover:bg-[rgba(201,100,66,0.08)]" href="/" style={{ borderColor: authBorder, color: authText }}>
              Back to home
            </Link>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="grid w-full max-w-[1120px] gap-8 lg:grid-cols-[1.02fr_0.98fr]">
            <motion.section
              animate={{ opacity: 1, x: 0 }}
              className="hidden rounded-[32px] border p-8 shadow-[0_32px_120px_rgba(0,0,0,0.28)] backdrop-blur-2xl lg:flex lg:flex-col"
              style={{ borderColor: authBorder, backgroundColor: authBg }}
              initial={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.34, ease: "easeOut" }}
            >
              <div className="inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.22em]" style={{ borderColor: authBorderStrong, color: authCoral, backgroundColor: "rgba(201,100,66,0.06)" }}>
                {eyebrow}
              </div>
              <h1
                className="mt-7 max-w-[12ch] text-[3.6rem] font-semibold leading-[0.92] tracking-[-0.06em] sm:text-[4rem]"
                style={{ color: authText, fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                {title}
              </h1>
              <p className="mt-5 max-w-[42ch] text-base leading-8" style={{ color: authMuted }}>{subtitle}</p>

              <div className="mt-10 space-y-4">
                {authHighlights.map((item, index) => (
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-4 rounded-[24px] border px-5 py-5"
                    style={{ borderColor: authBorder, backgroundColor: authCard }}
                    initial={{ opacity: 0, y: 16 }}
                    key={item.title}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-2xl text-white"
                      style={{ backgroundColor: "rgba(201,100,66,0.14)", color: authCoral }}
                    >
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-medium" style={{ color: authText }}>{item.title}</h2>
                      <p className="mt-2 text-sm leading-7" style={{ color: authMuted }}>{item.detail}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-auto flex items-center gap-3 pt-10 text-sm" style={{ color: authMuted }}>
                <span className="rounded-full border px-3 py-1.5" style={{ borderColor: authBorder, backgroundColor: authCard }}>AI Operating System</span>
                <span className="rounded-full border px-3 py-1.5" style={{ borderColor: authBorder, backgroundColor: authCard }}>Memory-native</span>
                <span className="rounded-full border px-3 py-1.5" style={{ borderColor: authBorder, backgroundColor: authCard }}>Provider-orchestrated</span>
              </div>
            </motion.section>

            <motion.section
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[32px] border p-6 shadow-[0_32px_120px_rgba(0,0,0,0.34)] backdrop-blur-2xl sm:p-8"
              style={{ borderColor: authBorder, backgroundColor: authPanel }}
              initial={{ opacity: 0, y: 18 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              {children}
            </motion.section>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LoginForm({ nextPath = "/chat", initialError = null }: AuthFormProps) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    error: initialError,
    loading: false,
    success: null
  });

  async function handleSubmit(formData: FormData) {
    setState({ error: null, loading: true, success: null });

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password")
      })
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setState({
        error: payload.error || "Unable to sign you in.",
        loading: false,
        success: null
      });
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  return (
    <AuthFormCard
      alternateAction={
        <p className="text-sm" style={{ color: authMuted }}>
          New to Xeivora?{" "}
          <Link className="font-medium transition hover:opacity-80" href={`/signup?next=${encodeURIComponent(nextPath)}`} style={{ color: authCoral }}>
            Create an account
          </Link>
        </p>
      }
      eyebrow="Sign in"
      footer={
        <div className="flex items-center justify-between gap-3">
          <Link className="text-sm transition hover:opacity-80" href="/forgot-password" style={{ color: authCoral }}>
            Forgot password?
          </Link>
          <span className="text-xs uppercase tracking-[0.18em]" style={{ color: "rgba(240,234,216,0.35)" }}>Session persisted</span>
        </div>
      }
      state={state}
      subtitle="Sign in to continue your chats, memory lanes, files, and orchestrated workflows."
      title="Welcome back"
    >
      <GoogleButton href={`/api/auth/google?next=${encodeURIComponent(nextPath)}`} label="Continue with Google" />
      <Divider />
      <AuthForm action={handleSubmit} submitLabel="Sign in" submittingLabel="Signing in..." state={state}>
        <Field label="Email address" name="email" placeholder="you@xeivora.com" type="email" />
        <Field label="Password" name="password" placeholder="Enter your password" type="password" />
      </AuthForm>
    </AuthFormCard>
  );
}

export function SignupForm({ nextPath = "/chat", initialError = null }: AuthFormProps) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    error: initialError,
    loading: false,
    success: null
  });

  async function handleSubmit(formData: FormData) {
    setState({ error: null, loading: true, success: null });
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password")
      })
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setState({
        error: payload.error || "Unable to create your account.",
        loading: false,
        success: null
      });
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  return (
    <AuthFormCard
      alternateAction={
        <p className="text-sm" style={{ color: authMuted }}>
          Already have an account?{" "}
          <Link className="font-medium transition hover:opacity-80" href={`/login?next=${encodeURIComponent(nextPath)}`} style={{ color: authCoral }}>
            Sign in
          </Link>
        </p>
      }
      eyebrow="Create account"
      footer={<span className="text-xs uppercase tracking-[0.18em]" style={{ color: "rgba(240,234,216,0.35)" }}>Password-secured workspace</span>}
      state={state}
      subtitle="Create your Xeivora workspace to unify memory, providers, tools, projects, and conversations."
      title="Start inside the AI operating system"
    >
      <GoogleButton href={`/api/auth/google?next=${encodeURIComponent(nextPath)}`} label="Continue with Google" />
      <Divider />
      <AuthForm action={handleSubmit} submitLabel="Create account" submittingLabel="Creating account..." state={state}>
        <Field label="Full name" name="name" placeholder="Luxshan Nadarajah" type="text" />
        <Field label="Email address" name="email" placeholder="you@xeivora.com" type="email" />
        <Field label="Password" name="password" placeholder="At least 8 characters" type="password" />
      </AuthForm>
    </AuthFormCard>
  );
}

export function ForgotPasswordForm({ initialError = null }: AuthFormProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [state, setState] = useState<AuthState>({
    error: initialError,
    loading: false,
    success: null
  });

  async function handleSubmit(formData: FormData) {
    setState({ error: null, loading: true, success: null });
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email")
      })
    });
    const payload = (await response.json()) as { error?: string; message?: string; previewUrl?: string | null };

    if (!response.ok) {
      setState({
        error: payload.error || "Unable to start password reset.",
        loading: false,
        success: null
      });
      return;
    }

    setPreviewUrl(payload.previewUrl || null);
    setState({
      error: null,
      loading: false,
      success: payload.message || "If the account exists, a reset link has been prepared."
    });
  }

  return (
    <AuthFormCard
      alternateAction={
        <p className="text-sm" style={{ color: authMuted }}>
          Remembered it?{" "}
          <Link className="font-medium transition hover:opacity-80" href="/login" style={{ color: authCoral }}>
            Back to sign in
          </Link>
        </p>
      }
      eyebrow="Password reset"
      footer={
        previewUrl ? (
          <Link className="inline-flex items-center gap-2 text-sm transition hover:opacity-80" href={previewUrl} style={{ color: authCoral }}>
            Open preview reset link
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className="text-xs uppercase tracking-[0.18em]" style={{ color: "rgba(240,234,216,0.35)" }}>Reset links expire in 30 minutes</span>
        )
      }
      state={state}
      subtitle="Enter your email and Xeivora will prepare a secure password reset flow."
      title="Reset your password"
    >
      <AuthForm action={handleSubmit} submitLabel="Send reset link" submittingLabel="Preparing link..." state={state}>
        <Field label="Email address" name="email" placeholder="you@xeivora.com" type="email" />
      </AuthForm>
    </AuthFormCard>
  );
}

export function ResetPasswordForm({ initialError = null, resetToken = null }: AuthFormProps) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    error: initialError || (!resetToken ? "This reset link is missing a token." : null),
    loading: false,
    success: null
  });

  async function handleSubmit(formData: FormData) {
    if (!resetToken) {
      return;
    }

    const password = `${formData.get("password") || ""}`;
    const confirmPassword = `${formData.get("confirmPassword") || ""}`;

    if (password !== confirmPassword) {
      setState({
        error: "Passwords do not match.",
        loading: false,
        success: null
      });
      return;
    }

    setState({ error: null, loading: true, success: null });
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: resetToken,
        password
      })
    });
    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setState({
        error: payload.error || "Unable to reset your password.",
        loading: false,
        success: null
      });
      return;
    }

    router.push("/chat");
    router.refresh();
  }

  return (
    <AuthFormCard
      alternateAction={
        <p className="text-sm" style={{ color: authMuted }}>
          Need a new link?{" "}
          <Link className="font-medium transition hover:opacity-80" href="/forgot-password" style={{ color: authCoral }}>
            Request another reset
          </Link>
        </p>
      }
      eyebrow="Choose a new password"
      footer={<span className="text-xs uppercase tracking-[0.18em]" style={{ color: "rgba(240,234,216,0.35)" }}>You’ll be signed in after reset</span>}
      state={state}
      subtitle="Set a new password to continue your Xeivora workspace without losing momentum."
      title="Create a new password"
    >
      <AuthForm action={handleSubmit} submitLabel="Save new password" submittingLabel="Updating password..." state={state}>
        <Field label="New password" name="password" placeholder="At least 8 characters" type="password" />
        <Field label="Confirm password" name="confirmPassword" placeholder="Repeat your new password" type="password" />
      </AuthForm>
    </AuthFormCard>
  );
}

function AuthFormCard({
  alternateAction,
  children,
  eyebrow,
  footer,
  state,
  subtitle,
  title
}: {
  alternateAction: ReactNode;
  children: ReactNode;
  eyebrow: string;
  footer: ReactNode;
  state: AuthState;
  subtitle: string;
  title: string;
}) {
  return (
    <div>
      <div
        className="rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.22em]"
        style={{ borderColor: authBorderStrong, color: authCoral, backgroundColor: "rgba(201,100,66,0.06)" }}
      >
        {eyebrow}
      </div>
      <h1
        className="mt-6 text-[2rem] font-semibold leading-[1.02] tracking-[-0.05em] sm:text-[2.35rem]"
        style={{ color: authText, fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        {title}
      </h1>
      <p className="mt-4 max-w-[42ch] text-[15px] leading-7" style={{ color: authMuted }}>{subtitle}</p>

      <div className="mt-8">{children}</div>

      {state.error ? (
        <div className="mt-5 rounded-[18px] border px-4 py-3 text-sm" style={{ borderColor: "rgba(201,100,66,0.28)", backgroundColor: "rgba(201,100,66,0.08)", color: "#f3c0b4" }}>
          {state.error}
        </div>
      ) : null}
      {state.success ? (
        <div className="mt-5 rounded-[18px] border px-4 py-3 text-sm" style={{ borderColor: "rgba(201,100,66,0.24)", backgroundColor: "rgba(201,100,66,0.06)", color: authText }}>
          {state.success}
        </div>
      ) : null}

      <div className="mt-6">{alternateAction}</div>
      <div className="mt-8 border-t pt-5" style={{ borderColor: authBorder }}>{footer}</div>
    </div>
  );
}

function AuthForm({
  action,
  children,
  state,
  submitLabel,
  submittingLabel
}: {
  action: (formData: FormData) => Promise<void>;
  children: ReactNode;
  state: AuthState;
  submitLabel: string;
  submittingLabel: string;
}) {
  return (
    <form
      action={(formData) => {
        void action(formData);
      }}
      className="space-y-4"
    >
      {children}
      <Button
        className="mt-2 h-14 w-full rounded-full bg-[#c96442] text-base font-semibold text-white shadow-[0_18px_48px_rgba(201,100,66,0.24)] transition hover:bg-[#a04e32]"
        disabled={state.loading}
        type="submit"
      >
        {state.loading ? submittingLabel : submitLabel}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  placeholder,
  type
}: {
  label: string;
  name: string;
  placeholder: string;
  type: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium" style={{ color: authText }}>{label}</span>
      <input
        className="h-14 rounded-[20px] border bg-[#1a1410] px-4 text-[15px] text-[#f0ead8] outline-none transition placeholder:text-[rgba(240,234,216,0.35)]"
        style={{
          borderColor: "rgba(201,100,66,0.2)"
        }}
        name={name}
        placeholder={placeholder}
        required
        type={type}
        onFocus={(event) => {
          event.currentTarget.style.borderColor = authCoral;
        }}
        onBlur={(event) => {
          event.currentTarget.style.borderColor = "rgba(201,100,66,0.2)";
        }}
      />
    </label>
  );
}

function Divider() {
  return (
    <div className="my-6 flex items-center gap-4 text-xs uppercase tracking-[0.18em]" style={{ color: "rgba(240,234,216,0.35)" }}>
      <div className="h-px flex-1" style={{ backgroundColor: "rgba(240,234,216,0.15)" }} />
      <span>or</span>
      <div className="h-px flex-1" style={{ backgroundColor: "rgba(240,234,216,0.15)" }} />
    </div>
  );
}

function GoogleButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="flex h-14 items-center justify-center gap-3 rounded-full border text-[15px] font-medium transition hover:bg-[rgba(201,100,66,0.08)]"
      href={href}
      style={{ borderColor: "rgba(201,100,66,0.3)", backgroundColor: authCard, color: authText }}
    >
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold" style={{ backgroundColor: authText, color: authBg }}>
        G
      </span>
      {label}
    </Link>
  );
}
