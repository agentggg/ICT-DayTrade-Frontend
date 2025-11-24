// src/reuseable/CandleChart.jsx
import React, { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";

const CandleChart = ({
  candles,
  height = 560,
  title,
  timeframe,
  obZones = [],
  onCandleClick,
}) => {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const priceLinesRef = useRef([]);
  const candlesRef = useRef([]);
  const clickHandlerRef = useRef(null);

  // Create chart once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      height,
      layout: { background: { color: "#020617" }, textColor: "#cbd5f5" },
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
      timeScale: { borderVisible: false },
      rightPriceScale: { borderVisible: false },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    chartRef.current = chart;
    seriesRef.current = candleSeries;

    const handleClick = (param) => {
      if (!onCandleClick || !param.time) return;
      const t = Number(param.time);
      const found = candlesRef.current.find((c) => Number(c.time) === t);
      if (found) onCandleClick(found);
    };

    clickHandlerRef.current = handleClick;
    chart.subscribeClick(handleClick);

    return () => {
      if (clickHandlerRef.current) {
        chart.unsubscribeClick(clickHandlerRef.current);
      }
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      priceLinesRef.current = [];
    };
  }, [height, onCandleClick]);

  // Update candles
  useEffect(() => {
    if (!seriesRef.current || !candles?.length) return;
    candlesRef.current = candles;
    seriesRef.current.setData(candles);
  }, [candles]);

  // Draw OB zones
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    priceLinesRef.current.forEach((pl) => series.removePriceLine(pl));
    priceLinesRef.current = [];

    obZones.forEach((zone) => {
      const color = zone.direction === "bullish" ? "#16a34a" : "#dc2626";

      const topLine = series.createPriceLine({
        price: zone.high,
        color,
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: zone.direction === "bullish" ? "Bullish OB" : "Bearish OB",
      });

      const bottomLine = series.createPriceLine({
        price: zone.low,
        color,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: false,
      });

      priceLinesRef.current.push(topLine, bottomLine);
    });
  }, [obZones]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height,
        borderRadius: "1rem",
        overflow: "hidden",
      }}
    />
  );
};

export default CandleChart;