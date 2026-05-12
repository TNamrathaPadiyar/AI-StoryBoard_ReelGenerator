import { motion } from "framer-motion";

const particles = [
  { top: "10%", left: "12%", delay: 0, size: 6 },
  { top: "20%", left: "78%", delay: 1.2, size: 4 },
  { top: "34%", left: "22%", delay: 0.6, size: 5 },
  { top: "48%", left: "88%", delay: 1.8, size: 3 },
  { top: "62%", left: "16%", delay: 0.9, size: 4 },
  { top: "74%", left: "70%", delay: 1.4, size: 5 },
  { top: "82%", left: "36%", delay: 0.3, size: 4 },
];

function SceneBackground() {
  return (
    <>
      <div className="ambient-grid" />
      <motion.div
        className="ambient-glow"
        animate={{ rotate: [0, 6, 0, -5, 0], scale: [1, 1.05, 1, 1.03, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="ambient-ribbon"
        animate={{ x: ["-8%", "4%", "-8%"], opacity: [0.24, 0.42, 0.24] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="ambient-orb" />
      <div className="ambient-particles">
        {particles.map((particle, index) => (
          <motion.span
            key={`${particle.top}-${particle.left}`}
            className="ambient-particle"
            style={{ top: particle.top, left: particle.left, width: particle.size, height: particle.size }}
            animate={{ y: [0, -22, 0], opacity: [0.2, 0.9, 0.2], scale: [1, 1.25, 1] }}
            transition={{
              duration: 6 + index,
              delay: particle.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </>
  );
}

export default SceneBackground;
