import React from "react";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div style={styles.wrapper}>
      <h1 style={styles.code}>404</h1>
      <p style={styles.text}>Oops... this page doesn’t exist</p>
      <p style={styles.text}>...yet 😉😎</p>

      <button style={styles.button} onClick={() => navigate("/")}>
        Take Me Home
      </button>

      <div style={styles.glow}></div>
    </div>
  );
}

const styles = {
  wrapper: {
    height: "100vh",
    backgroundColor: "#000",
    color: "#fff",
    fontFamily: "'Roboto', sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    textAlign: "center"
  },

  code: {
    fontSize: "90px",
    fontWeight: "bold",
    color: "#ea5a28",
    marginBottom: "10px",
    animation: "pulse 2s infinite",
  },

  text: {
    fontSize: "20px",
    opacity: 0.8,
    marginBottom: "25px",
  },

  button: {
    backgroundColor: "#111",
    border: "2px solid #ea5a28",
    padding: "12px 25px",
    fontSize: "18px",
    color: "#fff",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "0.3s",
  },

  glow: {
    position: "absolute",
    width: "300px",
    height: "300px",
    background: "radial-gradient(circle, rgba(234,90,40,0.25) 0%, rgba(0,0,0,0) 65%)",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: -1,
    animation: "slowGlow 4s infinite alternate",
  }
};