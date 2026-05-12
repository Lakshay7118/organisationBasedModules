"use client";
import API from "./utils/api";
import { useEffect, useState } from "react";
import DashboardPage from "./componets/DashboardPage";

export default function Page() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError("");

    if (!email.trim()) { setError("Please enter your email."); return; }
    if (!password.trim()) { setError("Please enter your password."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await API.post("/users/login", { email: email.trim(), password });
      const data = res.data;
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("role", data.user.role);
      setUser(data.user);
      window.dispatchEvent(new Event("loginStatusChanged"));
    } catch (err) {
      setError(err.response?.data?.error || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  if (user) return <DashboardPage />;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .login-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Sans', 'Segoe UI', sans-serif;
          background: #f0f2f5;
          position: relative;
          overflow: hidden;
          padding: 20px;
        }

        .login-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2300a884' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 0;
        }

        .login-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 400px;
          background: #ffffff;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 8px 40px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06);
          border: 1px solid rgba(0,0,0,0.06);
        }

        .card-header {
          background: linear-gradient(160deg, #00a884 0%, #008069 100%);
          padding: 40px 32px 36px;
          text-align: center;
          position: relative;
        }

        .card-header::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0; right: 0;
          height: 28px;
          background: #ffffff;
          border-radius: 28px 28px 0 0;
        }

        .wa-icon-wrap {
          width: 72px;
          height: 72px;
          background: rgba(255,255,255,0.18);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 18px;
          backdrop-filter: blur(8px);
          border: 2px solid rgba(255,255,255,0.3);
        }

        .card-title {
          font-size: 22px;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.3px;
          margin-bottom: 6px;
        }

        .card-subtitle {
          font-size: 13px;
          color: rgba(255,255,255,0.82);
          font-weight: 400;
        }

        .card-body {
          padding: 28px 28px 32px;
          background: #ffffff;
        }

        .field-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #6c757d;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin-bottom: 8px;
        }

        .wa-input {
          width: 100%;
          padding: 14px 18px;
          font-size: 15px;
          font-family: inherit;
          border: 1.5px solid #dee2e6;
          border-radius: 14px;
          outline: none;
          background: #f8f9fa;
          color: #212529;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          caret-color: #00a884;
        }

        .wa-input::placeholder { color: #adb5bd; }

        .wa-input:focus {
          border-color: #00a884;
          box-shadow: 0 0 0 3px rgba(0,168,132,0.12);
          background: #ffffff;
        }

        .password-wrap {
          position: relative;
        }

        .password-wrap .wa-input {
          padding-right: 52px;
        }

        .toggle-password {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          color: #adb5bd;
          display: flex;
          align-items: center;
          transition: color 0.2s;
        }

        .toggle-password:hover { color: #6c757d; }

        .wa-btn {
          width: 100%;
          padding: 15px;
          font-size: 15px;
          font-weight: 700;
          font-family: inherit;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
          letter-spacing: 0.3px;
        }

        .wa-btn.primary {
          background: #00a884;
          color: #fff;
          box-shadow: 0 4px 14px rgba(0,168,132,0.30);
        }

        .wa-btn.primary:hover:not(:disabled) {
          background: #009e7e;
          box-shadow: 0 6px 20px rgba(0,168,132,0.38);
          transform: translateY(-1px);
        }

        .wa-btn.primary:active:not(:disabled) { transform: translateY(0); }

        .wa-btn:disabled {
          background: #e9ecef;
          color: #adb5bd;
          cursor: not-allowed;
          box-shadow: none;
        }

        .error-box {
          background: #fff5f5;
          border: 1px solid #fecaca;
          border-radius: 12px;
          padding: 12px 16px;
          color: #dc2626;
          font-size: 13px;
          line-height: 1.5;
          margin-bottom: 18px;
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }

        .card-footer {
          text-align: center;
          font-size: 11px;
          color: #adb5bd;
          margin-top: 22px;
          line-height: 1.6;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner {
          display: inline-block;
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          vertical-align: middle;
        }
      `}</style>

      <div className="login-root">
        <div className="login-card">

          {/* ── HEADER ── */}
          <div className="card-header">
            <div className="wa-icon-wrap">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12c0 2.09.64 4.04 1.74 5.66L2 22l4.34-1.74C7.96 21.36 9.91 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" fill="rgba(255,255,255,0.9)" />
                <path d="M17 14.5c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.95 1.16-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.48-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.6-.92-2.2-.24-.57-.49-.5-.67-.5-.17 0-.37-.02-.57-.02-.2 0-.52.07-.8.37-.27.3-1.02 1-1.02 2.43 0 1.43 1.05 2.82 1.2 3.02.15.2 2.05 3.12 4.97 4.38.7.3 1.24.48 1.66.61.7.22 1.34.19 1.84.12.56-.08 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.12-.27-.19-.57-.34z" fill="#00a884" />
              </svg>
            </div>
            <div className="card-title">WhatsApp Business</div>
            <div className="card-subtitle">Sign in to your account.</div>
          </div>

          {/* ── BODY ── */}
          <div className="card-body">
            <form onSubmit={handleLogin}>

              <div style={{ marginBottom: 18 }}>
                <label className="field-label">Email</label>
                <input
                  className="wa-input"
                  type="email"
                  placeholder="e.g. john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label className="field-label">Password</label>
                <div className="password-wrap">
                  <input
                    className="wa-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword((p) => !p)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="error-box">
                  <span style={{ fontSize: 15, flexShrink: 0 }}>⚠</span>
                  {error}
                </div>
              )}

              <button type="submit" className="wa-btn primary" disabled={loading}>
                {loading ? <span className="spinner" /> : "Sign In →"}
              </button>

              <div className="card-footer">
                🔒 Your data is encrypted end-to-end.<br />
                By continuing, you agree to our Terms & Privacy Policy.
              </div>

            </form>
          </div>

        </div>
      </div>
    </>
  );
}