// src/pages/ObPage.jsx
import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import CandleChart from "../reuseable/CandleChart";
import getIpAddress from "../config";
import axios from "axios";
import "./ChartPage.css";

const WINDOW = 200;
const ipAddress = getIpAddress();
const TIMEFRAMES = ["1m", "3m", "5m", "15m", "1h"];

const CATEGORY_CONFIG = [
  { id: "prior",     label: "Prior move (3)",           max: 3, order: 0 },
  { id: "lastTrend", label: "Last candle of trend (1)", max: 1, order: 1 },
  { id: "engulf",    label: "Engulf candle (1)",        max: 1, order: 2 },
  { id: "fvg",       label: "FVG / Displacement (3)",   max: 3, order: 3 },
];

const ObPage = () => {
  const [candles, setCandles] = useState([]);
  const [timeframe, setTimeframe] = useState("5m");
  const [isLoading, setIsLoading] = useState(false);
  const [checking, setChecking] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  const [obZones, setObZones] = useState([]);
  const [selectedCandles, setSelectedCandles] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState("prior");

  const activeCategoryRef = useRef("prior");
  useEffect(() => {
    activeCategoryRef.current = activeCategoryId;
  }, [activeCategoryId]);

  const fetchCandles = useCallback(
    async (tf = timeframe) => {
      try {
        setIsLoading(true);

        const res = await fetch(
          `${ipAddress}/get_candles/?instrument=GBPUSD&timeframe=${tf}&amount=43`
        );
        const data_res = await res.json();

        const flat = Array.isArray(data_res[0]) ? data_res.flat() : data_res;
        const slice = flat.length <= WINDOW ? flat : flat.slice(-WINDOW);

        const mapped = slice.map((c) => ({
          time: Math.floor(new Date(c.timestamp).getTime() / 1000),
          open: c._open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));

        setCandles(mapped);
        setTimeframe(tf);
      } catch (err) {
        console.error("Error fetching candles", err);
      } finally {
        setIsLoading(false);
      }
    },
    [timeframe]
  );

  useEffect(() => {
    fetchCandles(timeframe);
  }, [fetchCandles, timeframe]);

  // reset manual + zones when timeframe changes
  useEffect(() => {
    setSelectedCandles([]);
    setActiveCategoryId("prior");
    setObZones([]);
  }, [timeframe]);

  const handleResetSelection = useCallback(() => {
    setSelectedCandles([]);
    setActiveCategoryId("prior");
  }, []);

  // click on chart → add candle to current category
  const handleCandleClick = useCallback((candle) => {
    const currentCategoryId = activeCategoryRef.current;
    if (!currentCategoryId) return;

    const category = CATEGORY_CONFIG.find((c) => c.id === currentCategoryId);
    if (!category) return;

    setSelectedCandles((prev) => {
      let base = prev.filter((c) => c.time !== candle.time);
      const inCategory = base.filter((c) => c.roleId === currentCategoryId);

      if (category.max && inCategory.length >= category.max) {
        alert(`You already selected ${category.max} for "${category.label}".`);
        return base;
      }

      const roleIndex = inCategory.length + 1;

      return [
        ...base,
        {
          ...candle,
          roleId: currentCategoryId,
          roleIndex,
        },
      ];
    });
  }, []);

  // Auto OB check (bull/bear buttons)
  const handleAutoOb = useCallback(
    async (direction) => {
      if (!candles.length) {
        alert("No candles loaded yet");
        return;
      }

      const label =
        direction === "bullish" ? "Bullish Order Block" : "Bearish Order Block";

      try {
        setChecking(label);

        const response = await axios.post(`${ipAddress}/check_order_block/`, {
          candles,
          direction,
          require_displacement: true,
          min_body_ratio: 0.45,
        });

        const data = response?.data || {};
        const { ok, matches = [], reason } = data;
        const found = !!ok && matches.length > 0;
        const reasonText = reason || "";

        if (found) {
          const newZones = matches.map((m) => {
            const ob = m.ob;
            return {
              direction: m.direction,
              time: ob.time,
              low: ob.low,
              high: ob.high,
            };
          });
          setObZones(newZones);
        } else {
          setObZones([]);
        }

        setLastResult(
          `Order Blocks · ${
            found ? "YES ✅" : `NO ❌${reasonText ? " – " + reasonText : ""}`
          }`
        );

        alert(
          found
            ? "Order Block(s) detected ✅"
            : `No Order Block found ❌${
                reasonText ? "\nReason: " + reasonText : ""
              }`
        );
      } catch (err) {
        console.error("Auto OB check error:", err);
        setLastResult("Order Blocks · Error");
        alert("Auto OB check failed.");
      } finally {
        setChecking(null);
      }
    },
    [candles]
  );

  // Manual OB confirm
  const handleManualObCheck = async () => {
    if (!selectedCandles.length) {
      alert("Select candles first by category.");
      return;
    }

    const sorted = [...selectedCandles].sort((a, b) => {
      const catA = CATEGORY_CONFIG.find((c) => c.id === a.roleId)?.order ?? 99;
      const catB = CATEGORY_CONFIG.find((c) => c.id === b.roleId)?.order ?? 99;
      if (catA !== catB) return catA - catB;
      return (a.roleIndex || 0) - (b.roleIndex || 0);
    });

    const payloadCandles = sorted.map(({ roleId, roleIndex, ...rest }) => rest);

    if (payloadCandles.length < 5) {
      alert("You should have at least 5 candles (ideally 3+1+1+3).");
      return;
    }

    try {
      const response = await axios.post(`${ipAddress}/check_manual_ob/`, {
        candles: payloadCandles,
      });

      const { is_ob, direction, reason } = response.data;
      console.log("Manual OB result:", response.data);

      setLastResult(
        `Manual OB · ${
          is_ob
            ? `VALID ${direction?.toUpperCase()} OB ✅`
            : `NOT valid ❌${reason ? " – " + reason : ""}`
        }`
      );

      alert(
        is_ob
          ? `VALID ${direction?.toUpperCase()} OB ✅`
          : `NOT a valid OB ❌\n${reason || ""}`
      );
    } catch (err) {
      console.error("Manual OB check error:", err);
      alert("Manual OB check failed.");
    }
  };

  const describeRole = (roleId, roleIndex) => {
    switch (roleId) {
      case "prior":
        return `Prior move (${roleIndex}/3)`;
      case "lastTrend":
        return "Last candle of trend";
      case "engulf":
        return "Engulf candle";
      case "fvg":
        return `FVG / Displacement (${roleIndex}/3)`;
      default:
        return "Unassigned";
    }
  };

  const refreshPage = () => fetchCandles(timeframe);

  return (
    <div className="chart-root">
      <div className="chart-shell animate-fade-in">
        {/* HEADER */}
        <header className="chart-header">
          <div>
            <h1 className="chart-title">
              {`GBPUSD – ${timeframe} · Order Blocks`}
            </h1>
            <p className="chart-subtitle">
              ICT Training · Bullish & Bearish OB · Manual pattern helper
            </p>
          </div>
          <div className="chart-header-right">
            <span className="chip chip-gradient">GBPUSD</span>
            <span className="chip chip-soft">
              {candles.length ? `${candles.length} candles` : "Loading…"}
            </span>
          </div>
        </header>

        {/* TOOLBAR */}
        <div className="chart-toolbar">
          <div className="timeframe-group">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                className={`tf-btn ${tf === timeframe ? "tf-btn-active" : ""}`}
                onClick={() => fetchCandles(tf)}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="toolbar-right">
            {isLoading && <span className="pulse-dot" />}
            <button
              className="icon-btn"
              onClick={refreshPage}
              title="Refresh candles"
            >
              ↻
            </button>
          </div>
        </div>

        {/* CHART */}
        <div className="chart-card animate-slide-up">
          {isLoading && (
            <div className="chart-loading-overlay">
              <div className="spinner" />
              <span>Updating candles…</span>
            </div>
          )}
          <CandleChart
            candles={candles}
            height={560}
            title="GBPUSD"
            timeframe={timeframe}
            obZones={obZones}
            onCandleClick={handleCandleClick}
          />
        </div>

        {/* MANUAL OB PANEL */}
        <div className="selected-candles-panel">
          <div className="selected-header">
            <div>
              <h3>Manual OB Selection</h3>
              <p className="selected-help">
                Choose a category, then click candles on the chart.
                <br />
                Pattern: 3 prior → last trend candle → engulf → 3 FVG.
              </p>
            </div>

            <div className="selected-header-right">
              <span className="selected-count">
                {selectedCandles.length} selected
              </span>
              <button
                className="reset-selection-btn"
                type="button"
                onClick={handleResetSelection}
              >
                Reset
              </button>
            </div>
          </div>

          <div className="category-toolbar">
            {CATEGORY_CONFIG.map((cat) => {
              const used = selectedCandles.filter(
                (c) => c.roleId === cat.id
              ).length;
              const isActive = activeCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`category-chip ${
                    isActive ? "category-chip-active" : ""
                  }`}
                  onClick={() => setActiveCategoryId(cat.id)}
                >
                  <span>{cat.label}</span>
                  <span className="category-chip-count">
                    {used}/{cat.max}
                  </span>
                </button>
              );
            })}
          </div>

          <ul>
            {selectedCandles.map((c, idx) => (
              <li key={`${c.time}-${idx}`}>
                <span className="selected-role">
                  {describeRole(c.roleId, c.roleIndex)}
                </span>
                <span className="selected-ohlc">
                  {new Date(c.time * 1000).toLocaleTimeString()} · O:
                  {c.open} H:{c.high} L:{c.low} C:{c.close}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* ACTION BUTTONS */}
        <div className="actions-row animate-slide-up-delayed">
          <button
            className={`action-btn action-bull ${
              checking === "Bullish Order Block" ? "action-btn-loading" : ""
            }`}
            onClick={() => handleAutoOb("bullish")}
            disabled={checking !== null}
          >
            {checking === "Bullish Order Block"
              ? "Checking Bullish OB…"
              : "Bullish Order Block"}
          </button>

          <button
            className={`action-btn action-bear ${
              checking === "Bearish Order Block" ? "action-btn-loading" : ""
            }`}
            onClick={() => handleAutoOb("bearish")}
            disabled={checking !== null}
          >
            {checking === "Bearish Order Block"
              ? "Checking Bearish OB…"
              : "Bearish Order Block"}
          </button>

          <button
            className="action-btn action-manual-ob"
            onClick={handleManualObCheck}
          >
            Confirm Manual OB (Selected)
          </button>
        </div>

        {/* RESULT BANNER */}
        {lastResult && (
          <div className="result-banner animate-fade-in">
            <span className="result-label">Last Check</span>
            <span className="result-text">{lastResult}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ObPage;