import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import "../styles/theme.css";
import SceneBackground from "../components/SceneBackground";
import PageTransition from "../components/PageTransition";
import BrandMark from "../components/BrandMark";
import TopNav from "../components/TopNav";
import { useAuth } from "../context/AuthContext";
import { CaptionIcon, FrameIcon, PulseIcon, TrimIcon } from "../components/FeatureIcons";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from || "/dashboard";

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const result = await login(form);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    navigate(from, { replace: true });
  };

  return (
    <div className="site-shell auth-shell">
      <SceneBackground />
      <PageTransition>
        <div className="page">
          <TopNav showHome />
          <div className="auth-layout">
          <motion.section
            className="auth-promo glass-card"
            initial={{ opacity: 0, x: -28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <div className="brand">
              <div className="brand-mark">
                <BrandMark />
              </div>
              <div>
                <p className="brand-title">CinePulse Studio</p>
                <p className="brand-subtitle">Creative automation for short video pipelines</p>
              </div>
            </div>

            <h1>Step back into your editing cockpit.</h1>
            <p>
              Sign in to continue managing highlights, exports, and caption-ready reels from your own workspace.
            </p>

            <div className="auth-promo-grid">
              <div className="glass-card feature-card">
                <div className="feature-icon"><TrimIcon /></div>
                <h3>Highlight Scoring</h3>
                <p>Prioritize the strongest segments from long-form content.</p>
              </div>
              <div className="glass-card feature-card">
                <div className="feature-icon"><CaptionIcon /></div>
                <h3>Caption Layers</h3>
                <p>Bring timed subtitles into each rendered short automatically.</p>
              </div>
              <div className="glass-card feature-card">
                <div className="feature-icon"><PulseIcon /></div>
                <h3>Final Reel Output</h3>
                <p>Shape one stronger short-form reel from a single uploaded source.</p>
              </div>
              <div className="glass-card feature-card">
                <div className="feature-icon"><FrameIcon /></div>
                <h3>Vertical Ready</h3>
                <p>Shape content for reels, shorts, and mobile-first viewing.</p>
              </div>
            </div>
          </motion.section>

          <motion.section
            className="auth-card glass-card"
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.08 }}
          >
            <p className="showcase-label">Sign In</p>
            <h2>Welcome back</h2>
            <p>Use the account you created to continue to your dashboard.</p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  className="auth-input"
                  type="email"
                  name="email"
                  placeholder="creator@example.com"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="auth-field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  className="auth-input"
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary auth-submit">
                {submitting ? "Signing In..." : "Enter Dashboard"}
              </button>
            </form>

            {error ? <div className="error-banner">{error}</div> : null}

            <p className="auth-footer">
              New here? <Link className="auth-link" to="/register">Create your account</Link>
            </p>
          </motion.section>
          </div>
        </div>
      </PageTransition>
    </div>
  );
}

export default LoginPage;
