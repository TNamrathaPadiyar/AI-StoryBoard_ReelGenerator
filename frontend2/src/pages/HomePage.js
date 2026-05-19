import "../styles/theme.css";
import SceneBackground from "../components/SceneBackground";
import PageTransition from "../components/PageTransition";
import TopNav from "../components/TopNav";
import {
  CaptionIcon,
  FrameIcon,
  PulseIcon,
  TrimIcon,
} from "../components/FeatureIcons";

const features = [
  {
    title: "Smart Reel Generation",
    text: "Turn long videos into one polished video output with a focused narrative.",
    Icon: TrimIcon,
  },
  {
    title: "Automatic Captions",
    text: "Add subtitle-ready captions for English, Hindi, and Kannada quickly.",
    Icon: CaptionIcon,
  },
  {
    title: "Social Copy Built In",
    text: "Generate captions, hashtags, and thumbnail text that match your footage.",
    Icon: PulseIcon,
  },
  {
    title: "Vertical Export",
    text: "Produce one platform-ready reel optimized for Instagram Reels and YouTube Shorts.",
    Icon: FrameIcon,
  },
];

const stats = [
  { value: "15m", label: "accepts long-form uploads" },
  { value: "3", label: "languages supported" },
  { value: "9:16", label: "portrait-ready delivery" },
];

const productRows = [
  {
    kicker: "Single Result",
    title: "Upload one long video and receive one finished short.",
    text: "PulseForge keeps the process focused on a single strong output instead of multiple edits.",
  },
  {
    kicker: "Built for Social",
    title: "Captions, hashtags, and thumbnail guidance are included.",
    text: "Your final export is designed with vertical feed formats in mind.",
  },
  {
    kicker: "Fast Review",
    title: "Get a polished preview that is easy to approve.",
    text: "The dashboard shows one reel, transcript summary, and creative direction in a simple view.",
  },
];

function HomePage() {
  return (
    <div className="site-shell">
      <SceneBackground />
      <PageTransition>
        <div className="page">
          <TopNav showAuth />

          <section className="hero hero-simple">
            <div className="hero-copy">
              <div className="eyebrow hero-badge">Smart short-form video from long-form content</div>
              <h1>Convert one long upload into a polished, publish-ready short.</h1>
              <p className="hero-text">
                Upload a single source video and get one refined short with captions, thumbnail concept,
                hashtags, and export settings tuned for reels and social feeds.
              </p>

              <div className="hero-actions">
                <button className="btn btn-accent">Start Uploading</button>
                <button className="btn btn-ghost">See How It Works</button>
              </div>

              <div className="hero-summary-grid">
                <div className="summary-card glass-card">
                  <strong>One final short</strong>
                  <p>Keep output simple with one ready-to-share reel per upload.</p>
                </div>
                <div className="summary-card glass-card">
                  <strong>Auto captions</strong>
                  <p>Generate subtitle-ready text automatically for every video.</p>
                </div>
                <div className="summary-card glass-card">
                  <strong>Social-ready</strong>
                  <p>Exports are tuned for Reels, Shorts, and mobile-first viewing.</p>
                </div>
                <div className="summary-card glass-card">
                  <strong>Fast review</strong>
                  <p>Preview a polished reel, transcript summary, and creative direction at a glance.</p>
                </div>
              </div>
            </div>

            <div className="hero-panel glass-card">
              <div className="panel-title">Pulse preview</div>
              <div className="panel-screen">
                <div className="panel-line panel-line-lg" />
                <div className="panel-line panel-line-md" />
                <div className="panel-line panel-line-sm" />
              </div>
              <div className="panel-footer">One professional short with captions, thumbnail direction, and export settings.</div>
            </div>
          </section>

          <section className="feature-section">
            <div className="section-header">
              <div>
                <div className="showcase-label">What the product delivers</div>
                <h2>A streamlined workflow for creators, editors, and social teams.</h2>
              </div>
            </div>

            <div className="feature-grid feature-grid-hero">
              {features.map(({ title, text, Icon }) => (
                <div key={title} className="feature-card glass-card">
                  <div className="feature-icon"><Icon /></div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="stats-strip stats-strip-simple">
            {stats.map((item) => (
              <div key={item.label} className="mini-card glass-card">
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </section>

          <section className="story-grid story-grid-simple">
            {productRows.map((row) => (
              <div key={row.title} className="glass-card story-row">
                <div className="showcase-label">{row.kicker}</div>
                <h3>{row.title}</h3>
                <p>{row.text}</p>
              </div>
            ))}
          </section>
        </div>
      </PageTransition>
    </div>
  );
}

export default HomePage;
