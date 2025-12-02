// src/components/Home.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";

const topics = [
  {
    id: "fvg",
    route: "/fvg",
    title: "Fair Value Gaps (FVG)",
    tag: "Imbalance • Liquidity",
    description:
      "Learn how imbalances form, how to spot clean FVGs, and when they’re likely to be respected or violated.",
    emoji: "📉",
  },
  {
    id: "ob",
    route: "/ObPage",
    title: "Order Blocks",
    tag: "Smart Money • POI",
    description:
      "Study bullish & bearish order blocks, displacement after OBs, and how to build trade ideas around them.",
    emoji: "🏦",
  },
  {
    id: "bb",
    route: "/chart?mode=bb",
    title: "Breaker Blocks",
    tag: "Reversal • Stop Hunts",
    description:
      "See how failed order blocks become breaker blocks and how to use them for trend reversals and entries.",
    emoji: "🧱",
  },
  {
    id: "tja",
    route: "/",
    title: "AI Driven Performance Insights",
    tag: "SMC • Data-Driven",
    description:
      "Analyze weekly, monthly, and yearly PnL with color-coded charts, setup win-rates, psychology metrics, and a complete breakdown of your execution.",
    emoji: "📈",
  },
  {
  id: "learn",
  route: "/",
  title: "Trader Knowledge Hub",
  tag: "ICT • Playbook",
  description:
    "A complete learning center with ICT tutorials, strategy breakdowns, concept definitions, examples, and structured trading notes—built to sharpen your edge every day.",
  emoji: "📚",
}
];

const Home = () => {
  const navigate = useNavigate();
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState("");
  const [clickSound, setClickSound] = useState(null);

  // Load click sound once (put your sound at: public/sounds/click.mp3)
  useEffect(() => {
    const audio = new Audio(process.env.PUBLIC_URL + "/sounds/click.mp3");
    setClickSound(audio);
  }, []);

  const handleClick = (topic) => {
    console.log("🚀 ~ handleClick ~ topic:", topic)
    // play sound
    if (clickSound) {
      clickSound.currentTime = 0;
      clickSound.play().catch(() => {});
    }

    // trigger confetti
    setSelectedTitle(topic.title);
    setIsCelebrating(true);
    if (topic.id === "tja"){
      window.open('https://agentggg.github.io/Daytrade-Tracker-Frontend/', '_parent', 'noopener,noreferrer')
    }
    if (topic.id === "learn"){
      window.open('https://agentggg.github.io/DayTrade-ICT-Documentation/', '_blank', 'noopener,noreferrer')
    }
    // navigate after a short delay so user sees celebration
    setTimeout(() => {
      setIsCelebrating(false);
      navigate(topic.route);
    }, 800);
  };

  return (
    <div className="chart-menu chart-page page-fade-in">
      {/* subtle animated gradient background overlay */}
      <div className="chart-menu-bg-orbit" />

      <div className="chart-menu-shell page-fade-in">
        <div className="chart-menu-header">
          <span className="chart-menu-pill">
            <span className="live-dot" />
            ICT Study Hub
          </span>
          <h1>
            What do you want to <span className="highlight">master</span> today?
          </h1>
          <p>
            Choose a topic to see live charts, drills, and ICT-style examples.
            Each module trains your eye to see liquidity, imbalances, and
            structure in real time.
          </p>
        </div>

        <div className="chart-menu-grid">
          {topics.map((topic, index) => (
            <button
              key={topic.id}
              className="chart-menu-card float-in"
              onClick={() => handleClick(topic)}
              style={{ animationDelay: `${index * 120}ms` }}
            >
              <div className="chart-menu-card-glow" />
              <div className="chart-menu-icon">{topic.emoji}</div>
              <div className="chart-menu-card-body">
                <div className="chart-menu-tag">{topic.tag}</div>
                <h2>{topic.title}</h2>
                <p>{topic.description}</p>
              </div>
              <div className="chart-menu-card-footer">
                <span>Start lesson</span>
                <span className="chart-menu-arrow">→</span>
              </div>
            </button>
          ))}
        </div>

        <div className="chart-menu-footer">
          <span className="chart-menu-footer-text">
            Live training mode · Uses your synthetic ICT candles on the chart
          </span>
        </div>
      </div>

      {/* Confetti overlay */}
      {isCelebrating && (
        <div className="confetti-overlay">
          <div className="confetti-label">
            Loading <span>{selectedTitle}</span>…
          </div>
          {Array.from({ length: 60 }).map((_, i) => (
            <span
              key={i}
              className="confetti-piece"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.4}s`,
                animationDuration: `${0.9 + Math.random() * 0.7}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
