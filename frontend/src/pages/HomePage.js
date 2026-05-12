import { motion } from "framer-motion";
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
    text: "Turn long videos into one polished reel with stronger opening, middle, and ending moments.",
    Icon: TrimIcon,
  },
  {
    title: "Auto Captions",
    text: "Generate subtitle-ready reels with support for English, Hindi, and Kannada workflows.",
    Icon: CaptionIcon,
  },
  {
    title: "Content-Based Social Copy",
    text: "Get caption suggestions, hashtags, thumbnail text, and viral scoring tied to the uploaded video.",
    Icon: PulseIcon,
  },
  {
    title: "Vertical Social Export",
    text: "Export one strong vertical reel designed for Instagram Reels and YouTube Shorts.",
    Icon: FrameIcon,
  },
];

const flowCards = ["One Final Reel", "Content-Aware Caption", "Smart Thumbnail", "Platform-Ready Export"];

const stats = [
  { value: "15m", label: "Supports long-form uploads" },
  { value: "3", label: "English, Hindi, Kannada" },
  { value: "9:16", label: "Built for reels and shorts" },
];

const productRows = [
  {
    kicker: "Feature One",
    title: "Upload a long video and get one polished reel back.",
    text: "The product is focused on delivering one strong final result instead of making users sort through editing fragments.",
  },
  {
    kicker: "Feature Two",
    title: "Social-ready content comes with the reel.",
    text: "Caption suggestions, hashtags, transcript support, and thumbnail output are generated around the uploaded video.",
  },
  {
    kicker: "Feature Three",
    title: "Built for Instagram Reels and YouTube Shorts.",
    text: "The homepage stays focused on what users care about most: features, output, and platform-ready results.",
  },
];

function HomePage() {
  return (
    <div className="site-shell">
      <SceneBackground />
      <PageTransition>
        <div className="page">
          <TopNav showAuth />

          <section className="hero">
            <div className="hero-stage hero-stage-left hero-stage-clean">
              <motion.div
                className="hero-visual-shell glass-card"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                <div className="hero-visual-bg" />
                <div className="hero-visual-grid" />

                <motion.div
                  className="hero-spotlight"
                  animate={{ x: [0, 18, 0], y: [0, -10, 0] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                />

                <div className="hero-stack">
                  {flowCards.map((item, index) => (
                    <motion.div
                      key={item}
                      className={`visual-flow-card visual-flow-card-${index + 1}`}
                      initial={{ opacity: 0, x: -22 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.55, delay: index * 0.12, ease: "easeOut" }}
                    >
                      <span className="visual-flow-step">0{index + 1}</span>
                      <strong>{item}</strong>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  className="hero-preview-panel"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.75, delay: 0.18, ease: "easeOut" }}
                >
                  <div className="preview-phone">
                    <div className="preview-phone-head" />
                    <div className="preview-screen">
                      <motion.div
                        className="preview-wave"
                        animate={{ backgroundPositionY: ["0%", "100%"] }}
                        transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
                      />
                      <div className="preview-chip">AI Preview</div>
                      <div className="preview-line preview-line-lg" />
                      <div className="preview-line" />
                      <div className="preview-line preview-line-sm" />
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>

            <motion.div
              className="hero-copy"
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="eyebrow hero-badge">
                Cinematic AI workflow for creators and editors
              </div>

              <h1 className="hero-title">
                Convert long videos into
                <br />
                <span className="title-gradient">viral-ready shorts automatically.</span>
              </h1>

              <p className="hero-text">
                Upload one long video and get one sharper final reel with captions, thumbnail,
                hashtags, and platform-ready export shaped around your actual content.
              </p>

              <div className="flow-strip">
                {flowCards.map((item) => (
                  <div key={item} className="flow-pill glass-card">
                    {item}
                  </div>
                ))}
              </div>

              <motion.div
                className="product-panel glass-card"
                initial={{ opacity: 0, y: 26 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.2, ease: "easeOut" }}
              >
                <div className="showcase-header">
                  <div>
                    <div className="showcase-label">What You Get</div>
                    <h2 className="showcase-title">AI Smart Shorts Generator</h2>
                    <p className="showcase-text">
                      Upload a long-form video and get one vertical reel with captions, thumbnail, hashtags, and social-ready copy built around your content.
                    </p>
                  </div>
                  <div className="status-pill">One reel output</div>
                </div>

                <div className="feature-grid feature-grid-hero">
                  {features.map(({ title, text, Icon }, index) => (
                    <motion.div
                      key={title}
                      className="feature-card glass-card"
                      initial={{ opacity: 0, y: 26 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.45, delay: index * 0.12, ease: "easeOut" }}
                    >
                      <div className="feature-icon">
                        <Icon />
                      </div>
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </section>

          <section className="stats-strip">
            {stats.map((item) => (
              <div key={item.label} className="mini-card glass-card">
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </section>

          <section className="story-grid">
            {productRows.map((row) => (
              <motion.div
                key={row.title}
                className="glass-card story-row"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
              >
                <div className="showcase-label">{row.kicker}</div>
                <h3>{row.title}</h3>
                <p>{row.text}</p>
              </motion.div>
            ))}
          </section>
        </div>
      </PageTransition>
    </div>
  );
}

export default HomePage;
