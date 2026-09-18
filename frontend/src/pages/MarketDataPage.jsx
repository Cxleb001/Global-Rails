import { useState } from "react";
import { callTool } from "../api";

const TOKENS = ["USDC", "USDT", "AVAX", "ETH", "POL"];
const QUOTES = ["USD", "KES", "NGN", "GHS", "USDT", "USDC"];

function MarketDataPage({ onExecuted }) {
  const [token, setToken] = useState("USDC");
  const [quote, setQuote] = useState("KES");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const getRate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await callTool("fetch_market_price", { token, quote });

      if (res.success) {
        setResult(res.data);

        onExecuted({
          icon: "◈",
          title: "Market Data",
          detail: `${res.data.token} / ${res.data.quote}`,
          amount: `${res.data.rate} ${res.data.quote}`,
        });
      } else {
        setError(res.error || "Unable to retrieve market data.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="content market-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">MARKETS</span>
          <h2>Market Data</h2>
          <p className="page-intro">
            Check current token and currency rates using the same market data
            service available to your AI financial agent.
          </p>
        </div>

        <div className="live-indicator">
          <span className="live-dot"></span>
          Live data
        </div>
      </div>

      <div className="card market-card">
        <div className="card-heading">
          <div>
            <span className="card-label">MARKET QUOTE</span>
            <h3>Get a rate</h3>
            <p>Select an asset and the currency you want to compare it against.</p>
          </div>
        </div>

        <div className="form-row market-form">
          <label className="form-field">
            <span>Asset</span>
            <select
              value={token}
              onChange={(event) => setToken(event.target.value)}
            >
              {TOKENS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <div className="swap-direction" aria-hidden="true">
            →
          </div>

          <label className="form-field">
            <span>Quote currency</span>
            <select
              value={quote}
              onChange={(event) => setQuote(event.target.value)}
            >
              {QUOTES.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </label>

          <button
            className="primary-button"
            onClick={getRate}
            disabled={loading}
          >
            {loading ? "Fetching..." : "Get rate"}
          </button>
        </div>

        {error && (
          <div className="status-message error-message">
            <span>!</span>
            <div>
              <strong>Unable to fetch rate</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="rate-result">
            <div className="rate-result-top">
              <span className="card-label">CURRENT RATE</span>
              <span className="rate-status">
                <span className="live-dot"></span>
                Available
              </span>
            </div>

            <div className="rate-main">
              <div>
                <span className="rate-pair">
                  {result.token} / {result.quote}
                </span>

                <strong className="rate-value">{result.rate}</strong>

                <span className="rate-unit">
                  {result.quote} per {result.token}
                </span>
              </div>
            </div>

            <div className="rate-meta">
              <div>
                <span>Asset</span>
                <strong>{result.token}</strong>
              </div>

              <div>
                <span>Quote</span>
                <strong>{result.quote}</strong>
              </div>

              <div>
                <span>Network</span>
                <strong>{result.chain}</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="market-note">
        <div className="market-note-icon">AI</div>

        <div>
          <strong>Available to your AI financial agent</strong>
          <p>
            Ask the agent for a market rate and it can use this same market
            data capability before preparing an action.
          </p>
        </div>
      </div>
    </section>
  );
}

export default MarketDataPage;