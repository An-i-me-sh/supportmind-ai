import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export default function Login() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        // Public registration — always creates a customer account
        await api.post("/register", {
          email,
          password,
          full_name: fullName,
          role: "customer", // backend ignores this anyway, but being explicit
        });

        // Auto-login after registration
        const tokenData = await api.post("/login", { email, password });
        localStorage.setItem("token", tokenData.access_token);

        const userProfile = await api.get("/profile");
        localStorage.setItem("user", JSON.stringify(userProfile));

        navigate(userProfile.role === "admin" ? "/" : "/chat");
      } else {
        // Login — works for both customers and admins
        const tokenData = await api.post("/login", { email, password });
        localStorage.setItem("token", tokenData.access_token);

        const userProfile = await api.get("/profile");
        localStorage.setItem("user", JSON.stringify(userProfile));

        navigate(userProfile.role === "admin" ? "/" : "/chat");
      }
    } catch (err) {
      setShake(true);
      setError(err.message || "Failed to authenticate");
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col justify-between">
      {/* Header */}
      <header className="w-full py-md px-margin-mobile md:px-margin-desktop border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-[32px] text-primary">smart_toy</span>
          <span className="font-headline-md text-headline-md font-bold text-primary">SupportMind AI</span>
        </div>
      </header>

      {/* Main card */}
      <main className="flex-1 flex items-center justify-center py-2xl px-md">
        <section className={`w-full max-w-[480px] p-xl rounded-2xl bg-surface-container-lowest border border-outline-variant shadow-lg transition-transform ${shake ? "animate-shake" : ""}`}>
          <div className="text-center mb-xl">
            <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">
              {isRegister ? "Create Account" : "Access Console"}
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-sm">
              {isRegister
                ? "Register as a customer to start using AI-powered support."
                : "Sign in with your credentials to enter the AI support console."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-lg">
            {error && (
              <div className="p-md bg-error-container/10 border border-error/20 text-error text-body-sm rounded-lg">
                {error}
              </div>
            )}

            {/* Full Name — only shown on register */}
            {isRegister && (
              <div className="space-y-xs group">
                <label className="font-label-md text-label-md text-on-surface-variant group-focus-within:text-primary transition-colors">
                  Full Name
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline-variant text-[20px]">
                    person
                  </span>
                  <input
                    type="text"
                    className="w-full h-12 pl-11 pr-md bg-transparent border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface focus:border-primary input-halo transition-all outline-none"
                    placeholder="Jane Doe"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="space-y-xs group">
              <label className="font-label-md text-label-md text-on-surface-variant group-focus-within:text-primary transition-colors">
                Email Address
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline-variant text-[20px]">
                  mail
                </span>
                <input
                  type="email"
                  className="w-full h-12 pl-11 pr-md bg-transparent border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface focus:border-primary input-halo transition-all outline-none"
                  placeholder="name@company.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-xs group">
              <label className="font-label-md text-label-md text-on-surface-variant group-focus-within:text-primary transition-colors">
                Password
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline-variant text-[20px]">
                  lock
                </span>
                <input
                  type={passwordVisible ? "text" : "password"}
                  className="w-full h-12 pl-11 pr-11 bg-transparent border border-outline-variant rounded-lg font-body-md text-body-md text-on-surface focus:border-primary input-halo transition-all outline-none"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible(!passwordVisible)}
                  className="absolute right-md top-1/2 -translate-y-1/2 text-outline-variant hover:text-on-surface transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {passwordVisible ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* Info badge — shown on register to clarify admin accounts */}
            {isRegister && (
              <div className="p-md bg-primary/5 border border-primary/20 text-on-surface-variant text-body-sm rounded-lg flex items-start gap-sm">
                <span className="material-symbols-outlined text-primary text-[18px] mt-[2px]">info</span>
                <span>New accounts are registered as <strong>Customer</strong> accounts. Admin accounts can only be created by an existing administrator.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:shadow-lg active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-sm group cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div>
                  <span>{isRegister ? "Creating..." : "Verifying..."}</span>
                </>
              ) : (
                <>
                  <span>{isRegister ? "Sign Up" : "Sign In"}</span>
                  <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          </form>

          <p className="mt-2xl text-center font-body-sm text-body-sm text-on-surface-variant">
            {isRegister ? (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => { setIsRegister(false); setError(""); }}
                  className="text-primary font-label-md hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </>
            ) : (
              <>
                Don't have an account?{" "}
                <button
                  onClick={() => { setIsRegister(true); setError(""); }}
                  className="text-primary font-label-md hover:underline cursor-pointer"
                >
                  Register Here
                </button>
              </>
            )}
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-md px-margin-mobile md:px-margin-desktop border-t border-outline-variant flex flex-col md:flex-row justify-between items-center gap-md bg-surface-container-lowest/80">
        <p className="font-label-sm text-label-sm text-on-surface-variant">
          © 2026 SupportMind AI. Enterprise Intelligence.
        </p>
        <div className="flex gap-lg">
          <a className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors underline" href="#">
            Privacy Policy
          </a>
          <a className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors underline" href="#">
            Terms of Service
          </a>
        </div>
      </footer>
    </div>
  );
}
