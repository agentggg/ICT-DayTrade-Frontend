// src/pages/FvgPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import CandleChart from "../reuseable/CandleChart";
import getIpAddress from "../config";
import axios from "axios";
import "./ChartPage.css";

const WINDOW = 200;
const ipAddress = getIpAddress();
const TIMEFRAMES = ["1m", "3m", "5m", "15m", "1h"];

const FvgPage = () => {
  const [candles, setCandles] = useState([]);
  const [timeframe, setTimeframe] = useState("5m");
  const [isLoading, setIsLoading] = useState(false);
  const [checking, setChecking] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  const fetchCandles = useCallback(
    async (tf = timeframe) => {
      try {
        setIsLoading(true);
        const res = await fetch(
          `${ipAddress}/get_candles/?instrument=GBPUSD&timeframe=${tf}&amount=3`
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

  const handleAction = useCallback(async () => {
    if (!candles.length) {
      alert("No candles loaded yet");
      return;
    }

    try {
      setChecking("Check FVG");

      const response = await axios.post(`${ipAddress}/check_fvg/`, {
        "candles":candles,
      });

      const data = response?.data || {};
      const found = !!data.is_fvg || !!data.found || !!data.success;
      const reasonText = data.reason || "";

      setLastResult(
        `Fair Value Gaps · ${
          found ? "YES ✅" : `NO ❌${reasonText ? " – " + reasonText : ""}`
        }`
      );

      alert(
        found
          ? "FVG detected ✅"
          : `No FVG found ❌${reasonText ? "\nReason: " + reasonText : ""}`
      );
    } catch (err) {
      console.error("Check FVG error:", err);
      setLastResult("Fair Value Gaps · Error");
      alert("Check FVG failed — see console.");
    } finally {
      setChecking(null);
    }
  }, [candles]);

  const refreshPage = () => fetchCandles(timeframe);

  return (
    <div className="chart-root">
      <div className="chart-shell animate-fade-in">
        {/* HEADER */}
        <header className="chart-header">
          <div>
            <h1 className="chart-title">{`GBPUSD – ${timeframe} · Fair Value Gaps`}</h1>
            <p className="chart-subtitle">ICT Training · FVG only</p>
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
          />
        </div>

        {/* ACTION BUTTON */}
        <div className="actions-row animate-slide-up-delayed">
          <button
            className={`action-btn action-fvg ${
              checking ? "action-btn-loading" : ""
            }`}
            onClick={handleAction}
            disabled={checking !== null}
          >
            {checking ? "Checking FVG…" : "Check FVG"}
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

export default FvgPage;