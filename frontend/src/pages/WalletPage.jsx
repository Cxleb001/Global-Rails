// There's no get_balance tool in the backend yet — TOOLKIT only exposes
// fetch_market_price, transfer, swap_tokens, off_ramp_payout, and the x402
// pair (see backend/__init__.py). Wallet holdings shown here are the same
// demo figures as the Overview page. When a real balance tool exists, swap
// this static array for a callTool("get_balance", {}) call.

const HOLDINGS = [
  { symbol: "USDC", amount: "842.10", usdValue: "842.10" },
  { symbol: "USDT", amount: "406.22", usdValue: "406.22" },
];

function WalletPage() {
  const total = HOLDINGS.reduce(
    (sum, holding) => sum + parseFloat(holding.usdValue),
    0
  );

  return (
    <section className="content wallet-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">PORTFOLIO</span>
          <h2>Wallet</h2>
          <p className="page-intro">
            View the demo assets currently represented in your Global Rails
            portfolio.
          </p>
        </div>

        <div className="demo-badge">
          <span></span>
          Demo wallet
        </div>
      </div>

      <div className="balance-card">
        <div className="balance-card-header">
          <span className="card-label">TOTAL PORTFOLIO VALUE</span>
          <span className="balance-network">AVALANCHE C-CHAIN</span>
        </div>

        <div className="balance-value">${total.toFixed(2)}</div>

        <div className="balance-footer">
          <span>Testnet portfolio</span>
          <span>•</span>
          <span>Demo balance</span>
        </div>
      </div>

      <div className="section-heading">
        <div>
          <span className="eyebrow">ASSETS</span>
          <h3>Your holdings</h3>
        </div>

        <span className="asset-count">
          {HOLDINGS.length} assets
        </span>
      </div>

      <div className="wallet-assets">
        {HOLDINGS.map((holding) => (
          <div className="wallet-asset" key={holding.symbol}>
            <div className="asset-identity">
              <div className="asset-icon">
                {holding.symbol.charAt(0)}
              </div>

              <div>
                <strong>{holding.symbol}</strong>
                <span>Testnet asset</span>
              </div>
            </div>

            <div className="asset-values">
              <strong>{holding.amount}</strong>
              <span>${holding.usdValue}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="wallet-notice">
        <div className="wallet-notice-icon">i</div>

        <div>
          <strong>Demo balances</strong>
          <p>
            These figures are static demonstration values. Global Rails does
            not currently have a backend balance-reading tool connected to
            this wallet screen.
          </p>
        </div>
      </div>
    </section>
  );
}

export default WalletPage;