"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { createAuthClient } from "@neondatabase/auth/next";
import { Icon } from "@/components/icons";

const authClient = createAuthClient();

function PasswordResetForm() {
  const params = useSearchParams();
  const token = params.get("token");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    params.has("error")
      ? "That reset link is invalid or has expired. Request a new link."
      : "",
  );
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (token && password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const result = token
        ? await authClient.resetPassword({ newPassword: password, token })
        : await authClient.requestPasswordReset({
            email: email.trim(),
            redirectTo: new URL("/reset-password", window.location.origin).href,
          });
      if (result.error)
        throw new Error(
          result.error.message ||
            "The request could not be completed. Try again.",
        );
      if (token) {
        setPassword("");
        setConfirmation("");
        window.history.replaceState({}, "", "/reset-password");
      }
      setDone(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The request could not be completed. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-form-side" style={{ minHeight: "100vh" }}>
      <div className="login-topnote">
        <Icon name="lock" size={14} /> Staff &amp; agent access
      </div>
      <div className="login-form-container">
        <span className="eyebrow">YOUR ADMISSIONS WORKSPACE</span>
        <h2>
          {done
            ? token
              ? "Password updated."
              : "Check your email."
            : token
              ? "Choose a password."
              : "Reset your password."}
        </h2>
        <p>
          {done
            ? token
              ? "Your new password is ready. You can now sign in to your workspace."
              : "If an account exists for that address, a password reset link will arrive shortly."
            : token
              ? "Use a unique password with at least 12 characters."
              : "Enter your account email and we will send a link to choose your password."}
        </p>
        {!done && (
          <form onSubmit={submit}>
            {token ? (
              <>
                <label className="field">
                  <span>New password</span>
                  <div className="login-input">
                    <Icon name="lock" size={18} />
                    <input
                      autoFocus
                      type="password"
                      autoComplete="new-password"
                      minLength={12}
                      maxLength={128}
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="At least 12 characters"
                    />
                  </div>
                </label>
                <label className="field">
                  <span>Confirm new password</span>
                  <div className="login-input">
                    <Icon name="lock" size={18} />
                    <input
                      type="password"
                      autoComplete="new-password"
                      minLength={12}
                      maxLength={128}
                      required
                      value={confirmation}
                      onChange={(event) => setConfirmation(event.target.value)}
                      placeholder="Enter your new password again"
                    />
                  </div>
                </label>
              </>
            ) : (
              <label className="field">
                <span>Email address</span>
                <div className="login-input">
                  <Icon name="mail" size={19} />
                  <input
                    autoFocus
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={200}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Your account email"
                  />
                </div>
              </label>
            )}
            {error && (
              <div className="notice error" role="alert">
                <Icon name="info" size={18} />
                {error}
              </div>
            )}
            <button
              className="button primary full-button login-submit"
              disabled={busy}
              type="submit"
            >
              {busy ? (
                <span className="spinner small" />
              ) : (
                <>
                  {token ? "Save new password" : "Send reset link"}
                  <Icon name="arrow" size={18} />
                </>
              )}
            </button>
          </form>
        )}
        <p style={{ marginTop: "24px" }}>
          <a className="text-button" href="/login">
            Back to sign in <Icon name="arrow" size={15} />
          </a>
        </p>
      </div>
      <footer className="login-footer">
        <span>School of Graduate Studies · UTeM</span>
        <span>Secure admissions workspace</span>
      </footer>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="login-form-side" style={{ minHeight: "100vh" }}>
          <span className="spinner" aria-label="Loading password reset" />
        </main>
      }
    >
      <PasswordResetForm />
    </Suspense>
  );
}
