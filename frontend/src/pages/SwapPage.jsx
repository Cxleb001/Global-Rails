import { useState } from "react";
import { callTool } from "../api";

// Matches the tokens currently configured on Avalanche Fuji.
const TOKENS = ["USDC", "LINK", "AVAX"];

function SwapPage({ onExecuted }) {
  const [fromToken, setFromToken] = useState("USDC");
  const [toToken, setToToken] = useState("LINK");
  const [amount, setAmount] = useState("10");
  const [slippage, setSlippage] = useState("0.5");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const runSwap = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await callTool("swap_tokens", {
        from_token: fromToken,
        to_token: toToken,
        amount: parseFloat(amount),
        slippage: parseFloat(slippage),
        chain: "avalanche-fuji",
      });

      if (res.success) {
        setResult(res.data);

        onExecuted({
          icon: "⇄",
          title: "Token Swap",
          detail: `${res.data.from_token} → ${res.data.to_token}`,
          amount: `+${res.data.amount_out} ${res.data.to_token}`,
        });
      } else {
        setError(res.error || "Unable to complete the swap.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setResult(null);
    setError(null);
  };

  return (
    <section className="content swap-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">TRADE</span>
          <h2>Swap</h2>
          <p className="page-intro">
            Exchange supported tokens on Avalanche Fuji through the same
            execution service available to your AI financial agent.
          </p>
        </div>

        <div className="network-badge">
          <span></span>
          Avalanche Fuji
        </div>
      </div>

      <div className="swap-layout">
        <div className="card swap-card">
          <div className="card-heading">
            <div>
              <span className="card-label">TOKEN EXCHANGE</span>
              <h3>Swap assets</h3>
            </div>
          </div>

          <div className="swap-inputs">
            <label className="swap-box">
              <span>Sell</span>

              <div className="swap-input-row">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                />

                <select
                  value={fromToken}
                  onChange={(event) => {
                    setFromToken(event.target.value);
                    setResult(null);
                  }}
                >
                  {TOKENS.map((token) => (
                    <option key={token} value={token}>
                      {token}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <button
              type="button"
              className="swap-switch"
              onClick={switchTokens}
              aria-label="Switch tokens"
            >
              ⇅
            </button>

            <label className="swap-box">
              <span>Buy</span>

              <div className="swap-input-row">
                <input
                  type="text"
                  value="—"
                  readOnly
                  aria-label="Estimated received amount"
                />

                <select
                  value={toToken}
                  onChange={(event) => {
                    setToToken(event.target.value);
                    setResult(null);
                  }}
                >
                  {TOKENS.map((token) => (
                    <option key={token} value={token}>
                      {token}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          </div>

          <div className="swap-settings">
            <label className="form-field">
              <span>Slippage tolerance</span>

              <div className="input-with-suffix">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={slippage}
                  onChange={(event) => setSlippage(event.target.value)}
                />
                <span>%</span>
              </div>
            </label>

            <div className="swap-info">
              <span>Network</span>
              <strong>Avalanche Fuji</strong>
            </div>
          </div>

          {fromToken === toToken && (
            <div className="status-message error-message">
              <span>!</span>
              <div>
                <strong>Choose different tokens</strong>
                <p>The asset you sell must be different from the asset you receive.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="status-message error-message">
              <span>!</span>
              <div>
                <strong>Swap failed</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          <button
            className="primary-button swap-submit"
            onClick={runSwap}
            disabled={loading || fromToken === toToken || !amount}
          >
            {loading ? "Processing swap..." : "Review & swap"}
          </button>

          {result && (
            <div className="swap-result">
              <div className="swap-result-header">
                <div>
                  <span className="card-label">TRANSACTION RESULT</span>
                  <h4>Swap completed</h4>
                </div>

                <span className="success-status">
                  <span></span>
                  {result.status}
                </span>
              </div>

              <div className="swap-summary">
                <div>
                  <span>Sent</span>
                  <strong>
                    {result.amount_in} {result.from_token}
                  </strong>
                </div>

                <div className="summary-arrow">→</div>

                <div>
                  <span>Received</span>
                  <strong>
                    {result.amount_out} {result.to_token}
                  </strong>
                </div>
              </div>

              <div className="result-details">
                <div>
                  <span>Slippage tolerance</span>
                  <strong>{result.slippage_tolerance}</strong>
                </div>

                <div>
                  <span>Chain</span>
                  <strong>{result.chain}</strong>
                </div>

                <div>
                  <span>Transaction</span>
                  <strong className="tx-value">
                    {result.tx_hash
                      ? `${result.tx_hash.slice(0, 10)}...${result.tx_hash.slice(-8)}`
                      : "—"}
                  </strong>
                </div>
              </div>

              {result.explorer_url && (
                <a
                  href={result.explorer_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="msg-link swap-explorer"
                >
                  View transaction on explorer →
                </a>
              )}
            </div>
          )}
        </div>

        <aside className="swap-side-card">
          <span className="card-label">EXECUTION</span>
          <h3>Powered by your agent</h3>
          <p>
            This swap uses the same execution capability that the AI financial
            agent can call when you ask it to exchange assets.
          </p>

          <div className="execution-detail">
            <span>Supported assets</span>
            <strong>{TOKENS.join(" · ")}</strong>
          </div>

          <div className="execution-detail">
            <span>Network</span>
            <strong>Avalanche Fuji</strong>
          </div>

          <div className="execution-detail">
            <span>Environment</span>
            <strong>Testnet</strong>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default SwapPage;