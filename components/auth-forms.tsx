"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Alert } from "./ui";

type PasswordFieldProps = {
  id: "password" | "confirmPassword";
  label: string;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
};

function PasswordField({ id, label, autoComplete, minLength }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          className="input pr-12"
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={minLength}
          required
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-stone-500 hover:text-orange-700"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          title={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}

export function LoginForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd)),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error);
      setBusy(false);
      return;
    }
    router.push(body.redirect);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {error && <Alert>{error}</Alert>}
      <div>
        <label className="label" htmlFor="username">Username</label>
        <input className="input" id="username" name="username" autoComplete="username" required />
      </div>
      <PasswordField id="password" label="Password" autoComplete="current-password" />
      <button disabled={busy} className="btn btn-primary w-full">{busy ? "Signing in…" : "Sign in"}</button>
      <p className="text-center text-sm text-stone-500">New devotee? <Link className="font-bold text-orange-700" href="/register">Register</Link></p>
    </form>
  );
}

export function RegisterForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd)),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error);
      setBusy(false);
      return;
    }
    router.push("/login?registered=1");
  }

  const fields = [
    ["fullName", "Full name", "text", "name"],
    ["username", "Username", "text", "username"],
    ["mobile", "Mobile number (optional)", "tel", "tel"],
    ["email", "Email address", "email", "email"],
  ];

  return (
    <form onSubmit={submit}>
      <div className="grid gap-5 sm:grid-cols-2">
        {fields.map(([name, label, type, autoComplete]) => (
          <div key={name}>
            <label className="label" htmlFor={name}>{label}</label>
            <input
              className="input"
              id={name}
              name={name}
              type={type}
              autoComplete={autoComplete}
              required={name !== "mobile"}
            />
          </div>
        ))}
        <PasswordField id="password" label="Password" autoComplete="new-password" minLength={6} />
        <PasswordField id="confirmPassword" label="Confirm password" autoComplete="new-password" minLength={6} />
      </div>
      {error && <div className="mt-5"><Alert>{error}</Alert></div>}
      <p className="mt-5 text-xs text-stone-500">Use any password of at least 6 characters.</p>
      <button disabled={busy} className="btn btn-primary mt-6 w-full">{busy ? "Creating account…" : "Register account"}</button>
    </form>
  );
}
