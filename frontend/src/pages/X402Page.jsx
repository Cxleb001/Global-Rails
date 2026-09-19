import { useState } from "react";
import { callTool } from "../api";

function X402Page({ onExecuted }) {
  const [url, setUrl] = useState("https://example.com/protected-resource");
  const [token, setToken] = useState("USDC");
  const [amount, setAmount] = useState("1.0");

  const [invoice, setInvoice] = useState(null);
  const [proof, setProof] = useState(null);
  const [error, setError] = useState(null);
  const [loadingStep, setLoadingStep] = useState(null);

  const getInvoice = async () => {
    setLoadingStep("invoice");
    setError(null);
    setInvoice(null);
    setProof(null);

    try {
      const res = await callTool("x402_get_invoice", {
        url,
        token,
        amount: parseFloat(amount),
      });

      if (res.success) {
        setInvoice(res.data);
      } else {
        setError(res.error || "Unknown error");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingStep(null);
    }
  };

  const settle = async () => {
    if (!invoice) return;

    setLoadingStep("settle");
    setError(null);

    try {
      const res = await callTool("x402_settle_invoice", {
        invoice_id: invoice.invoice_id,
      });

      if (res.success) {
        setProof(res.data);

        onExecuted({
          icon: "₿",
          title: "x402 Payment",
          detail: new URL(url).hostname,
          amount: `-${invoice.amount} ${invoice.token}`,
        });
      } else {
        setError(res.error || "Unknown error");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingStep(null);
    }
  };

  return (
    <section className="content x402-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">AGENT PAYMENTS</span>
          <h2>x402 Payments</h2>
          <p>
            Let your financial agent discover and settle HTTP 402
            payment requirements.
          </p>
        </div>

        <div className="network-badge">
          <span className="network-dot" />
          HTTP 402
        </div>
      </div>

      <div className="x402-layout">
        <div className="x402-main">
          <div className="x402-card">
            <div className="x402-card-header">
              <div>
                <span className="card-label">STEP 01</span>
                <h3>Resolve payment request</h3>
              </div>

              <div className="x402-step-number">01</div>
            </div>

            <p className="x402-description">
              Provide the protected resource. The agent will resolve
              its HTTP 402 challenge into a payable invoice.
            </p>

            <label className="x402-field">
              <span>Protected resource</span>

              <input
                type="text"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://api.example.com/resource"
              />
            </label>

            <div className="x402-input-row">
              <label className="x402-field">
                <span>Payment token</span>

                <input
                  type="text"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder="USDC"
                />
              </label>

              <label className="x402-field">
                <span>Maximum amount</span>

                <div className="x402-amount">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                  <span>{token}</span>
                </div>
              </label>
            </div>

            {error && (
              <div className="status-message error-message">
                <span>!</span>

                <div>
                  <strong>Payment request failed</strong>
                  <p>{error}</p>
                </div>
              </div>
            )}

            <button
              className="x402-primary-button"
              onClick={getInvoice}
              disabled={loadingStep !== null}
            >
              {loadingStep === "invoice" ? (
                <>
                  <span className="button-spinner" />
                  Resolving request...
                </>
              ) : (
                <>
                  Resolve invoice
                  <span>→</span>
                </>
              )}
            </button>
          </div>

          {invoice && (
            <div className="x402-card invoice-card">
              <div className="x402-card-header">
                <div>
                  <span className="card-label">PAYMENT REQUEST</span>
                  <h3>Invoice ready</h3>
                </div>

                <div className="invoice-status">
                  {proof ? "PAID" : invoice.status}
                </div>
              </div>

              <div className="invoice-amount">
                <span>Amount due</span>
                <strong>
                  {invoice.amount} {invoice.token}
                </strong>
              </div>

              <div className="invoice-details">
                <div>
                  <span>Invoice ID</span>
                  <strong className="break-value">
                    {invoice.invoice_id}
                  </strong>
                </div>

                <div>
                  <span>Network</span>
                  <strong>{invoice.chain}</strong>
                </div>

                <div>
                  <span>Asset</span>
                  <strong>{invoice.token}</strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong>{proof ? "PAID" : invoice.status}</strong>
                </div>
              </div>
            </div>
          )}

          {invoice && (
            <div className="x402-card settle-card">
              <div className="x402-card-header">
                <div>
                  <span className="card-label">STEP 02</span>
                  <h3>Settle payment</h3>
                </div>

                <div className="x402-step-number">02</div>
              </div>

              {!proof ? (
                <>
                  <p className="x402-description">
                    Review the invoice above before authorizing the
                    payment.
                  </p>

                  <button
                    className="x402-primary-button"
                    onClick={settle}
                    disabled={loadingStep !== null}
                  >
                    {loadingStep === "settle" ? (
                      <>
                        <span className="button-spinner" />
                        Settling payment...
                      </>
                    ) : (
                      <>
                        Pay {invoice.amount} {invoice.token}
                        <span>→</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div className="payment-complete">
                  <div className="payment-complete-header">
                    <div className="success-icon">✓</div>

                    <div>
                      <span className="card-label">
                        PAYMENT COMPLETE
                      </span>
                      <h3>Payment settled successfully</h3>
                    </div>
                  </div>

                  <div className="proof-details">
                    <div>
                      <span>Status</span>
                      <strong>{proof.status}</strong>
                    </div>

                    <div>
                      <span>Payment hash</span>
                      <strong className="break-value">
                        {proof.payment_hash}
                      </strong>
                    </div>

                    <div className="proof-full">
                      <span>Authorization header</span>
                      <strong className="break-value">
                        {proof.auth_header}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="x402-side-card">
          <span className="card-label">AGENT WORKFLOW</span>

          <h3>Machine-to-machine payments</h3>

          <p>
            x402 lets an agent discover that a resource requires
            payment, resolve the request, and settle it without a
            traditional checkout flow.
          </p>

          <div className="x402-flow">
            <div className={invoice ? "completed" : "active"}>
              <span>01</span>
              <div>
                <strong>402 challenge</strong>
                <p>Resource requests payment</p>
              </div>
            </div>

            <div className={invoice ? "active" : ""}>
              <span>02</span>
              <div>
                <strong>Invoice</strong>
                <p>Payment terms are resolved</p>
              </div>
            </div>

            <div className={proof ? "completed" : ""}>
              <span>03</span>
              <div>
                <strong>Settlement</strong>
                <p>Payment proof is returned</p>
              </div>
            </div>
          </div>

          <div className="x402-note">
            <span>i</span>
            <p>
              The two-step flow lets you see the amount before the
              payment is settled.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default X402Page;