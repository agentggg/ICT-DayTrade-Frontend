// src/pages/ChartPage.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import CandleChart from "../reuseable/CandleChart";
import getIpAddress from "../config";
import axios from "axios";
import "./ChartPage.css";
import { useLocation } from "react-router-dom";

const WINDOW = 200;
const ipAddress = getIpAddress();

const TIMEFRAMES = ["1m", "3m", "5m", "15m", "1h"];

const MODE_CONFIG = {
  fvg: {
    id: "fvg",
    title: "Fair Value Gaps",
    endpoint: "check_fvg",
    actions: [{ key: "fvg", label: "Check FVG" }],
    candle_amount: 3
  },
  ob: {
    id: "ob",
    title: "Order Blocks",
    endpoint: "check_order_block",
    actions: [
      { key: "ob_bull", label: "Bullish Order Block", direction: "bullish" },
      { key: "ob_bear", label: "Bearish Order Block", direction: "bearish" },
    ],
    candle_amount: 13
  },
  bb: {
    id: "bb",
    title: "Breaker Blocks",
    endpoint: "check_bb",
    actions: [{ key: "bb", label: "Check Breaker Block" }],
  },
};
 
const ChartPage = () => {
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const mode = params.get("mode") || "fvg";
  const modeConfig = MODE_CONFIG[mode] || MODE_CONFIG.fvg;

  const [candles, setCandles] = useState([]);
  const [timeframe, setTimeframe] = useState("3m");
  const [isLoading, setIsLoading] = useState(false);
  const [checking, setChecking] = useState(null); // holds current checking label
  const [lastResult, setLastResult] = useState(null);

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
    // intentionally not depending on timeframe — tf is passed explicitly
    []
  );

  useEffect(() => {
    fetchCandles(timeframe);
  }, [fetchCandles, timeframe]);

  const handleAction = async (action) => {
    if (!candles.length) return;

    const label = action.label || action.key;
    try {
      setChecking(label);

      const payload = { candles };
      if (action.direction) payload.direction = action.direction;

      const response = await axios.post(`${ipAddress}/${modeConfig.endpoint}/`, payload);

      // Try to detect a boolean-ish "found" value across possible response shapes
      const data = response?.data || {};
      const found =
        !!data.is_fvg || !!data.is_ob || !!data.is_bb || !!data.found || !!data.result || !!data.success;

      setLastResult(`${modeConfig.title} · ${found ? "YES ✅" : "NO ❌"}`);

      // lightweight user feedback (could be swapped for a toast)
      alert(found ? `${modeConfig.title} detected ✅` : `No ${modeConfig.title} found ❌`);
    } catch (err) {
      console.error("Check error:", err);
      setLastResult(`${modeConfig.title} · Error`);
      alert("Check failed — see console for details.");
    } finally {
      setChecking(null);
    }
  };

  const refreshPage = () => {
    fetchCandles(timeframe);
  };

  return (
    <div className="chart-root">
      <div className="chart-shell animate-fade-in">
        <header className="chart-header">
          <div>
            <h1 className="chart-title">{`GBPUSD – ${timeframe} Candles · ${modeConfig.title}`}</h1>
            <p className="chart-subtitle">ICT Training · Synthetic Feed</p>
          </div>
          <div className="chart-header-right">
            <span className="chip chip-gradient">GBPUSD</span>
            <span className="chip chip-soft">
              {candles.length ? `${candles.length} candles` : "Loading…"}
            </span>
          </div>
        </header>

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
            <button className="icon-btn" onClick={refreshPage} title="Refresh candles">
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
            onTimeframeChange={() => {}}
          />
        </div>

        <div className="actions-row animate-slide-up-delayed">
          {modeConfig.actions.map((action) => (
            <button
              key={action.key}
              className={`action-btn ${
                action.label.toLowerCase().includes("bull") ? "action-bull" : action.label.toLowerCase().includes("bear") ? "action-bear" : "action-fvg"
              } ${checking === action.label ? "action-btn-loading" : ""}`}
              onClick={() => handleAction(action)}
              disabled={checking !== null}
            >
              {checking === action.label ? `Checking ${action.label}…` : action.label}
            </button>
          ))}
        </div>

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