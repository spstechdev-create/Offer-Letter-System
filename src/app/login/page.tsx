"use client";

import { useState, type FormEvent } from "react";
import { Icon } from "@/components/icons";
import { authClient } from "@/components/auth-client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function signIn(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/",
      });
      if (result.error)
        throw new Error(
          result.error.message ||
            "Unable to sign in. Check your email and password.",
        );
      window.location.assign("/");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in. Please try again.",
      );
      setBusy(false);
    }
  }
  return (
    <main className="login-layout">
      <section className="login-story">
        <a className="login-brand" href="/">
          <div className="brand-monogram">
            SPS
            <span />
          </div>
          <span>
            School of
            <br />
            <strong>Graduate Studies</strong>
          </span>
        </a>
        <div className="login-story-content">
          <span className="mini-label">
            UNIVERSITI TEKNIKAL MALAYSIA MELAKA
          </span>
          <h1>
            Every ambition
            <br />
            begins with
            <br />
            <em>an opportunity.</em>
          </h1>
          <p>
            One connected workspace for postgraduate registrations and
            conditional offers.
          </p>
          <div className="login-story-line" />
          <div className="login-story-caption">
            <Icon name="catalogue" size={24} />
            <span>
              Supporting the next generation
              <br />
              of researchers and innovators.
            </span>
          </div>
        </div>
        <div className="login-story-footer">
          Graduate admissions, thoughtfully connected.
        </div>
        <div className="login-orbit orbit-one" />
        <div className="login-orbit orbit-two" />
      </section>
      <section className="login-form-side">
        <div className="login-topnote">
          <Icon name="lock" size={14} /> Staff & agent access
        </div>
        <div className="login-form-container">
          <span className="eyebrow">YOUR ADMISSIONS WORKSPACE</span>
          <h2>Welcome back.</h2>
          <p>Sign in to manage registrations and conditional offers.</p>
          <form onSubmit={signIn}>
            <label className="field">
              <span>Email address</span>
              <div className="login-input">
                <Icon name="mail" size={19} />
                <input
                  autoFocus
                  autoComplete="username"
                  type="email"
                  required
                  placeholder="you@utem.edu.my"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </label>
            <label className="field">
              <span>Password</span>
              <div className="login-input">
                <Icon name="lock" size={18} />
                <input
                  autoComplete="current-password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <Icon name="eye" size={18} />
                </button>
              </div>
            </label>
            <a className="login-reset-link" href="/reset-password">
              Forgot your password?
            </a>
            {error && (
              <div className="notice error" role="alert">
                <Icon name="info" size={18} />
                {error}
              </div>
            )}
            <button
              className="button primary full-button login-submit"
              type="submit"
              disabled={busy}
            >
              {busy ? (
                <span className="spinner small" />
              ) : (
                <>
                  Sign in to workspace <Icon name="arrow" size={18} />
                </>
              )}
            </button>
          </form>
          <div className="login-access-note">
            <Icon name="shield" size={19} />
            <p>
              Access is provided by your SPS administrator.
              <br />
              Contact your administrator if you need an account.
            </p>
          </div>
        </div>
        <footer className="login-footer">
          <span>School of Graduate Studies · UTeM</span>
          <span>Secure admissions workspace</span>
        </footer>
      </section>
    </main>
  );
}
