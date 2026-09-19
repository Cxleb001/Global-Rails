import { useState } from "react";
import { callTool } from "../api";

const TOKENS = ["USDC", "USDT"];

function TransferPage({ onExecuted }) {
  const [toAddress, setToAddress] = useState("");
  const [token, setToken] = useState("USDC");
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const canSubmit =
    toAddress.trim().length > 0 && amount && !loading;

  const runTransfer = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await callTool("transfer", {
        to_address: toAddress.trim(),
        token,
        amount: parseFloat(amount),
      });

      if (res.success) {
        setResult(res.data);

        onExecuted({
          icon: "↗",
          title: "Transfer",
          detail: `To ${res.data.to_address.slice(0, 10)}...`,
          amount: `-${res.data.amount} ${res.data.token}`,
        });
      } else {
        setError(res.error || "Unknown error");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="content transfer-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">PAYMENTS</span>
          <h2>Transfer</h2>
          <p>
            Send stablecoins securely to another wallet using your
            financial agent.
          </p>
        </div>

        <div className="network-badge">
          <span className="network-dot" />
          Avalanche Fuji
        </div>
      </div>

      <div className="transfer-layout">
        <div className="transfer-card">
          <div className="transfer-card-header">
            <div>
              <span className="card-label">SEND FUNDS</span>
              <h3>Transfer crypto</h3>
            </div>

            <div className="transfer-icon">↗</div>
          </div>

          <div className="recipient-section">
            <label className="transfer-field">
              <span>Recipient wallet</span>

              <input
                type="text"
                placeholder="0x..."
                value={toAddress}
                onChange={(event) => setToAddress(event.target.value)}
              />
            </label>
          </div>

          <div className="transfer-amount-row">
            <label className="transfer-field">
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

            <label className="transfer-field amount-field">
              <span>Amount</span>

              <div className="amount-input">
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0.00"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />

                <span>{token}</span>
              </div>
            </label>
          </div>

          <div className="transfer-details">
            <div>
              <span>Network</span>
              <strong>Avalanche Fuji</strong>
            </div>

            <div>
              <span>Gas payment</span>
              <strong>Paymaster · USDC</strong>
            </div>
          </div>

          {error && (
            <div className="status-message error-message">
              <span>!</span>
              <div>
                <strong>Transfer failed</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          <button
            className="transfer-submit"
            onClick={runTransfer}
            disabled={!canSubmit}
          >
            {loading ? (
              <>
                <span className="button-spinner" />
                Sending transfer...
              </>
            ) : (
              <>
                Send {token}
                <span>→</span>
              </>
            )}
          </button>
        </div>

        <aside className="transfer-side-card">
          <span className="card-label">AGENT POWERED</span>

          <h3>Send funds through your AI agent</h3>

          <p>
            The same transfer capability is available directly from
            the Global Rails financial agent.
          </p>

          <div className="agent-example">
            <span>You</span>
            <p>
              "Send 20 USDC to my wallet"
            </p>
          </div>

          <div className="agent-flow">
            <div>
              <span>01</span>
              <p>Validate recipient</p>
            </div>

            <div>
              <span>02</span>
              <p>Execute transfer</p>
            </div>

            <div>
              <span>03</span>
              <p>Confirm transaction</p>
            </div>
          </div>
        </aside>
      </div>

      {result && (
        <div className="transfer-result">
          <div className="result-success">
            <div className="success-icon">✓</div>

            <div>
              <span className="card-label">TRANSFER COMPLETE</span>
              <h3>{result.amount} {result.token} sent</h3>
            </div>
          </div>

          <div className="transfer-result-grid">
            <div>
              <span>Status</span>
              <strong>{result.status}</strong>
            </div>

            <div>
              <span>Recipient</span>
              <strong className="break-value">
                {result.to_address}
              </strong>
            </div>

            <div>
              <span>Gas</span>
              <strong>
                {result.gas_fee_usdc} USDC
              </strong>
            </div>

            <div>
              <span>Network</span>
              <strong>{result.chain}</strong>
            </div>

            <div className="full-result">
              <span>Transaction hash</span>
              <strong className="break-value">
                {result.tx_hash}
              </strong>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default TransferPage;