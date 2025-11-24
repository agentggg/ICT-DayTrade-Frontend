import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import CandleChart from "../reuseable/CandleChart";
import getIpAddress from "../config";
import axios from "axios";
import "./ChartPage.css";
import { useLocation } from "react-router-dom";

const WINDOW = 200;
const ipAddress = getIpAddress();

const TIMEFRAMES = ["1m", "3m", "5m", "15m", "1h"];

const CATEGORY_CONFIG = [
  { id: "prior",     label: "Prior move (3)",          max: 3, order: 0 },
  { id: "lastTrend", label: "Last candle of trend (1)",max: 1, order: 1 },
  { id: "engulf",    label: "Engulf candle (1)",       max: 1, order: 2 },
  { id: "fvg",       label: "FVG / Displacement (3)",  max: 3, order: 3 },
];

const MODE_CONFIG = {
  fvg: {
    id: "fvg",
    title: "Fair Value Gaps",
    endpoint: "check_fvg",
    actions: [{ key: "fvg", label: "Check FVG" }],
    candle_amount: 3,
  },
  ob: {
    id: "ob",
    title: "Order Blocks",
    endpoint: "check_order_block",
    actions: [
      { key: "ob_bull", label: "Bullish Order Block", direction: "bullish" },
      { key: "ob_bear", label: "Bearish Order Block", direction: "bearish" },
    ],
    candle_amount: 43,
  },
  bb: {
    id: "bb",
    title: "Breaker Blocks",
    endpoint: "check_breaker_block",
    actions: [
      { key: "bb_bull", label: "Bullish Breaker", direction: "bullish" },
      { key: "bb_bear", label: "Bearish Breaker", direction: "bearish" },
    ],
    candle_amount: 43,
  },
};

const ChartPage = () => {
  const location = useLocation();
  const params = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );
  const mode = params.get("mode") || "fvg";
  const modeConfig = MODE_CONFIG[mode] || MODE_CONFIG.fvg;

  const [candles, setCandles] = useState([]);
  const [timeframe, setTimeframe] = useState("5m");
  const [isLoading, setIsLoading] = useState(false);
  const [checking, setChecking] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  const [obZones, setObZones] = useState([]);
  const [selectedCandles, setSelectedCandles] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState("prior");

  // keep latest category for the click handler
  const activeCategoryRef = useRef("prior");
  useEffect(() => {
    activeCategoryRef.current = activeCategoryId;
  }, [activeCategoryId]);

  // 🔁 Reset manual selection
  const handleResetSelection = useCallback(() => {
    setSelectedCandles([]);
    setActiveCategoryId("prior");
  }, []);

  // 🟢 Click handler for candles – STABLE
  const handleCandleClick = useCallback((candle) => {
    const currentCategoryId = activeCategoryRef.current;
    if (!currentCategoryId) return;

    const category = CATEGORY_CONFIG.find((c) => c.id === currentCategoryId);
    if (!category) return;

    setSelectedCandles((prev) => {
      // remove any existing instance of this candle (by time)
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

  // clear manual state when timeframe / mode changes
  useEffect(() => {
    setSelectedCandles([]);
    setActiveCategoryId("prior");
    setObZones([]);
  }, [timeframe, mode]);

  // 🔄 Fetch candles
  const fetchCandles = useCallback(
    async (tf = timeframe) => {
      try {
        setIsLoading(true);

        const res = await fetch(
          `${ipAddress}/get_candles/?instrument=GBPUSD&timeframe=${tf}&amount=${modeConfig.candle_amount}`
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
    [timeframe, modeConfig.candle_amount]
  );

  useEffect(() => {
    fetchCandles(timeframe);
  }, [fetchCandles, timeframe]);

  // ▶️ Auto check (FVG / OB / BB) – unchanged logic
  const handleAction = useCallback(
    async (action) => {
      if (!candles.length) {
        alert("No candles loaded yet");
        return;
      }

      const label = action.label || action.key;

      try {
        setChecking(label);

        const payload = { candles };

        if (modeConfig.id === "ob") {
          payload.direction = action.direction;
          payload.require_displacement = true;
          payload.min_body_ratio = 0.45;
        } else if (modeConfig.id === "bb") {
          payload.direction = action.direction;
        }

        const response = await axios.post(
          `${ipAddress}/${modeConfig.endpoint}/`,
          payload
        );

        const data = response?.data || {};
        let found = false;
        let reasonText = "";

        if (modeConfig.id === "ob") {
          const { ok, matches = [], reason } = data;
          found = !!ok && matches.length > 0;
          reasonText = reason || "";
          console.log("OB matches:", matches);

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
        } else if (modeConfig.id === "fvg") {
          found = !!data.is_fvg || !!data.found || !!data.success;
          reasonText = data.reason || "";
        } else if (modeConfig.id === "bb") {
          found = !!data.ok && !!data.info && !!data.info.reason;
          reasonText = data.info?.reason || "";
        }

        setLastResult(
          `${modeConfig.title} · ${
            found ? "YES ✅" : `NO ❌${reasonText ? " – " + reasonText : ""}`
          }`
        );

        alert(
          found
            ? `${modeConfig.title} detected ✅`
            : `No ${modeConfig.title} found ❌${
                reasonText ? "\nReason: " + reasonText : ""
              }`
        );
      } catch (err) {
        console.error("Check error:", err);
        setLastResult(`${modeConfig.title} · Error`);
        alert("Check failed — see console for details.");
      } finally {
        setChecking(null);
      }
    },
    [candles, modeConfig]
  );

  // manual OB confirm – your existing backend call
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
              {`GBPUSD – ${timeframe} · ${modeConfig.title}`}
            </h1>
            <p className="chart-subtitle">
              ICT Training · Synthetic Candles · Step-by-step logic
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
                className={`tf-btn ${
                  tf === timeframe ? "tf-btn-active" : ""
                }`}
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

        {modeConfig.id === "ob" && (
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
)}
        {/* ACTION BUTTONS */}
        <div className="actions-row animate-slide-up-delayed">
          {modeConfig.actions.map((action) => (
            <button
              key={action.key}
              className={`action-btn ${
                action.label.toLowerCase().includes("bull")
                  ? "action-bull"
                  : action.label.toLowerCase().includes("bear")
                  ? "action-bear"
                  : "action-fvg"
              } ${checking === action.label ? "action-btn-loading" : ""}`}
              onClick={() => handleAction(action)}
              disabled={checking !== null}
            >
              {checking === action.label
                ? `Checking ${action.label}…`
                : action.label}
            </button>
          ))}

          {modeConfig.id === "ob" && (
            <button
              className="action-btn action-manual-ob"
              onClick={handleManualObCheck}
            >
              Confirm Manual OB (Selected)
            </button>
          )}
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

export default ChartPage;