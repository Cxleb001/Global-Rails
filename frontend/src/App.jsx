import React, { useState, useEffect } from "react";
import "./App.css";
import { callTool } from "./api";
import MarketDataPage from "./pages/MarketDataPage";
import WalletPage from "./pages/WalletPage";
import SwapPage from "./pages/SwapPage";
import TransferPage from "./pages/TransferPage";
import X402Page from "./pages/X402Page";
import ActivityPage from "./pages/ActivityPage";
import DeveloperPage from "./pages/DeveloperPage";

function linkify(text) {
  const urlRegex = /(https?:\/\/[^\s)]+)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const url = match[0];

    parts.push(
      React.createElement(
        "a",
        {
          key: match.index,
          href: url,
          target: "_blank",
          rel: "noopener noreferrer",
          className: "msg-link",
        },
        url
      )
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function pickToolFromMessage(text) {
  const swapMatch = text.match(
    /swap\s+([\d.]+)\s*([a-zA-Z.]+)\s+(?:to|for|into)\s+([a-zA-Z.]+)/i
  );

  if (swapMatch) {
    return {
      tool: "swap_tokens",
      payload: {
        amount: parseFloat(swapMatch[1]),
        from_token: swapMatch[2].toUpperCase(),
        to_token: swapMatch[3].toUpperCase(),
        chain: "avalanche-fuji",
      },
      describe: (d) =>
        d.explorer_url
          ? `Swapped ${d.amount_in} ${d.from_token} for ${d.amount_out} ${d.to_token} on ${d.chain} via ${d.dex}. Verify: ${d.explorer_url}`
          : `Swapped ${d.amount_in} ${d.from_token} for ${d.amount_out} ${d.to_token} on ${d.chain} (tx ${d.tx_hash.slice(0, 10)}...).`,
    };
  }

  if (/m-?pesa|momo|mobile money|off.?ramp|payout/i.test(text)) {
    const amountMatch = text.match(/([\d.]+)\s*([a-zA-Z]+)/);
    const phoneMatch = text.match(/(?:\+?254|0)([71]\d{8})\b/);

    return {
      tool: "off_ramp_payout",
      payload: {
        amount: amountMatch ? parseFloat(amountMatch[1]) : 20,
        currency: "KES",
        phone_number: phoneMatch ? phoneMatch[0] : "254700000000",
      },
      describe: (d) =>
        d.status === "PENDING"
          ? `${d.message} (tracking ID: ${d.checkout_request_id})`
          : d.status === "FAILED"
          ? `Payout failed: ${d.detail || d.error || "unknown error"}`
          : `Paid out ${d.amount_delivered} ${d.currency} to ${d.recipient} via ${d.network} (ref ${d.transaction_id}).`,
    };
  }

  if (/x402|invoice|payment request/i.test(text)) {
    return {
      tool: "x402_get_invoice",
      payload: {
        url: "https://example.com/protected-resource",
        token: "USDC",
      },
      describe: (d) =>
        `Resolved invoice ${d.invoice_id}: ${d.amount} ${d.token} on ${d.chain} (status ${d.status}).`,
    };
  }

  const addressMatch = text.match(/0x[a-fA-F0-9]{6,}/);

  if (addressMatch) {
    const amountMatch = text.match(/([\d.]+)\s*([a-zA-Z]+)/);

    return {
      tool: "transfer",
      payload: {
        to_address: addressMatch[0],
        amount: amountMatch ? parseFloat(amountMatch[1]) : 1,
        token: amountMatch ? amountMatch[2].toUpperCase() : "USDC",
      },
      describe: (d) =>
        `Sent ${d.amount} ${d.token} to ${d.to_address} (gas ${d.gas_fee_usdc} USDC).`,
    };
  }

  const pairMatch = text.match(
    /\b([a-zA-Z]{2,6})\b\s*(?:\/|to|vs\.?)\s*\b([a-zA-Z]{2,6})\b/i
  );

  const token = pairMatch ? pairMatch[1].toUpperCase() : "USDC";
  const quote = pairMatch ? pairMatch[2].toUpperCase() : "KES";

  return {
    tool: "fetch_market_price",
    payload: { token, quote },
    describe: (d) => `1 ${d.token} = ${d.rate} ${d.quote} on ${d.chain}.`,
  };
}

const TOOL_META = {
  fetch_market_price: { icon: "◈", title: "Market Data" },
  swap_tokens: { icon: "⇄", title: "Token Swap" },
  transfer: { icon: "↗", title: "Transfer" },
  off_ramp_payout: { icon: "↗", title: "M-Pesa Payout" },
  x402_get_invoice: { icon: "₿", title: "x402 Invoice" },
  x402_settle_invoice: { icon: "₿", title: "x402 Payment" },
};

function App() {
  const [activePage, setActivePage] = useState("Overview");

  const [messages, setMessages] = useState([
    {
      role: "agent",
      text: "Hello. I'm your Global Rails financial agent. I can check market rates, swap tokens, transfer funds, and handle x402 payments.",
    },
  ]);

  const [input, setInput] = useState("");
  const [activities, setActivities] = useState([]);

  const [overviewRate, setOverviewRate] = useState(null);
  const [overviewRateError, setOverviewRateError] = useState(null);

  const logActivity = (entry) => {
    setActivities((current) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: Date.now(),
        ...entry,
      },
      ...current,
    ]);
  };

  useEffect(() => {
    let cancelled = false;
    let attempt = 0;
    const maxAttempts = 3;

    const tryFetch = () => {
      callTool("fetch_market_price", {
        token: "USDC",
        quote: "KES",
      })
        .then((res) => {
          if (cancelled) return;

          if (res.success) {
            setOverviewRate(res.data);
            setOverviewRateError(null);
          } else if (attempt < maxAttempts - 1) {
            attempt += 1;
            setTimeout(tryFetch, 5000);
          } else {
            setOverviewRateError(res.error || "Unknown error");
          }
        })
        .catch((err) => {
          if (cancelled) return;

          if (attempt < maxAttempts - 1) {
            attempt += 1;
            setTimeout(tryFetch, 5000);
          } else {
            setOverviewRateError(err.message);
          }
        });
    };

    tryFetch();

    return () => {
      cancelled = true;
    };
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userText = input.trim();

    setMessages((current) => [
      ...current,
      {
        role: "user",
        text: userText,
      },
    ]);

    setInput("");

    try {
      const history = messages.slice(-8).map((m) => ({
        role: m.role === "agent" ? "assistant" : "user",
        content: m.text,
      }));

      const agentResponse = await fetch("/api/agent/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userText,
          history,
        }),
      });

      const agentResult = await agentResponse.json();

      if (agentResult.configured && !agentResult.error) {
        if (
          agentResult.tool_used &&
          agentResult.tool_result?.success
        ) {
          const meta = TOOL_META[agentResult.tool_used] || {
            icon: "✦",
            title: agentResult.tool_used,
          };

          logActivity({
            icon: meta.icon,
            title: meta.title,
            detail: "via AI Agent chat",
            amount:
              agentResult.reply.length > 40
                ? `${agentResult.reply.slice(0, 40)}...`
                : agentResult.reply,
          });
        }

        setMessages((current) => [
          ...current,
          {
            role: "agent",
            text: agentResult.reply,
          },
        ]);

        return;
      }
    } catch {
      // Fall back to local routing.
    }

    const { tool, payload, describe } =
      pickToolFromMessage(userText);

    try {
      const result = await callTool(tool, payload);

      const agentText = result.success
        ? describe(result.data)
        : `I couldn't complete that (${tool}): ${
            result.error || "Unknown error"
          }`;

      if (result.success) {
        const meta = TOOL_META[tool] || {
          icon: "✦",
          title: tool,
        };

        logActivity({
          icon: meta.icon,
          title: meta.title,
          detail: "via AI Agent chat",
          amount:
            agentText.length > 40
              ? `${agentText.slice(0, 40)}...`
              : agentText,
        });
      }

      setMessages((current) => [
        ...current,
        {
          role: "agent",
          text: agentText,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "agent",
          text: `I couldn't connect to the Global Rails backend: ${error.message}`,
        },
      ]);
    }
  };

  const applySuggestion = (text) => {
    setInput(text);
  };

  const navigation = [
    { name: "Overview", icon: "⌂" },
    { name: "AI Agent", icon: "✦", special: true },
    { name: "Market Data", icon: "◈" },
    { name: "Wallet", icon: "◫" },
    { name: "Swap", icon: "⇄" },
    { name: "Transfer", icon: "↗" },
    { name: "x402 Payments", icon: "₿" },
    { name: "Activity", icon: "◷" },
    { name: "Developer", icon: "⚙" },
  ];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-mark">
            <svg
              width="26"
              height="26"
              viewBox="-16 -16 32 32"
              aria-hidden="true"
            >
              <circle
                cx="0"
                cy="0"
                r="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="M 0,-15 A 11.49,15 0 0 1 0,15"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                opacity="0.75"
              />
              <path
                d="M 0,-15 A 11.49,15 0 0 0 0,15"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                opacity="0.75"
              />
              <path
                d="M -13.75 -6 Q 0 -3.3 13.75 -6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path
                d="M -15 0 L 15 0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path
                d="M -13.75 6 Q 0 3.3 13.75 6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="logo-text">
            <h1>Global Rails</h1>
            <span>Agent Finance</span>
          </div>
        </div>

        <nav className="navigation">
          <p className="nav-label">WORKSPACE</p>

          {navigation.map((item) => (
            <button
              key={item.name}
              className={`nav-item ${
                activePage === item.name ? "active" : ""
              } ${item.special ? "agent-nav" : ""}`}
              onClick={() => setActivePage(item.name)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.name}</span>

              {item.special && (
                <span className="agent-new">AI</span>
              )}
            </button>
          ))}
        </nav>

        <div className="agent-status">
          <div className="status-dot"></div>

          <div>
            <strong>Agent Online</strong>
            <span>Ready for execution</span>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-title">
            <span className="eyebrow">GLOBAL RAILS</span>
            <h2>{activePage}</h2>
          </div>

          <div className="topbar-right">
            <div className="network">
              <span className="network-dot"></span>
              Avalanche Fuji
            </div>

            <div className="avatar">M</div>
          </div>
        </header>

        {activePage === "AI Agent" ? (
          <section className="agent-page">
            <div className="agent-page-header">
              <div className="agent-heading-copy">
                <div className="large-agent-icon">✦</div>

                <span className="eyebrow">
                  AUTONOMOUS FINANCIAL AGENT
                </span>

                <h1>What can I execute for you?</h1>

                <p>
                  Tell Global Rails what you want to do in plain language.
                  The agent can check markets, swap assets, transfer funds,
                  and handle machine-to-machine payments.
                </p>
              </div>

              <div className="connection-badge">
                <span></span>
                AGENT ONLINE
              </div>
            </div>

            <div className="agent-workspace">
              <div className="chat-panel">
                <div className="chat-panel-header">
                  <div className="agent-identity">
                    <div className="mini-agent-icon">✦</div>

                    <div>
                      <strong>Global Rails Agent</strong>
                      <span>Financial execution assistant</span>
                    </div>
                  </div>

                  <div className="online-label">
                    <span></span>
                    Online
                  </div>
                </div>

                <div className="chat-messages large-chat">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`chat-message ${message.role}`}
                    >
                      <div className="message-label">
                        {message.role === "agent"
                          ? "GLOBAL RAILS AGENT"
                          : "YOU"}
                      </div>

                      <div className="message-text">
                        {linkify(message.text)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="chat-suggestions">
                  <button
                    onClick={() =>
                      applySuggestion(
                        "What's the current USDC to KES rate?"
                      )
                    }
                  >
                    USDC / KES rate
                  </button>

                  <button
                    onClick={() =>
                      applySuggestion("Swap 10 USDC to LINK")
                    }
                  >
                    Swap 10 USDC
                  </button>

                  <button
                    onClick={() =>
                      applySuggestion("Send 20 USDC to M-Pesa")
                    }
                  >
                    Send to M-Pesa
                  </button>

                  <button
                    onClick={() =>
                      applySuggestion("Pay the x402 request")
                    }
                  >
                    Pay x402
                  </button>
                </div>

                <div className="large-chat-input">
                  <input
                    type="text"
                    value={input}
                    onChange={(event) =>
                      setInput(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        sendMessage();
                      }
                    }}
                    placeholder="Ask your financial agent..."
                  />

                  <button
                    onClick={sendMessage}
                    disabled={!input.trim()}
                    aria-label="Send message"
                  >
                    ↑
                  </button>
                </div>

                <p className="input-hint">
                  Enter to send · Agent executes through Global Rails tools
                </p>
              </div>

              <aside className="tool-panel">
                <div className="tool-panel-title">
                  <span className="card-label">
                    AGENT CAPABILITIES
                  </span>

                  <h3>Available tools</h3>
                </div>

                <div className="tool">
                  <div className="tool-icon">◈</div>

                  <div>
                    <strong>fetch_market_price</strong>
                    <span>Live market rates</span>
                  </div>

                  <i>Ready</i>
                </div>

                <div className="tool">
                  <div className="tool-icon">⇄</div>

                  <div>
                    <strong>swap_tokens</strong>
                    <span>Token exchange</span>
                  </div>

                  <i>Ready</i>
                </div>

                <div className="tool">
                  <div className="tool-icon">↗</div>

                  <div>
                    <strong>transfer</strong>
                    <span>Stablecoin transfers</span>
                  </div>

                  <i>Ready</i>
                </div>

                <div className="tool">
                  <div className="tool-icon">₿</div>

                  <div>
                    <strong>x402</strong>
                    <span>Machine payments</span>
                  </div>

                  <i>Ready</i>
                </div>

                <div className="execution-card">
                  <span className="card-label">
                    LAST EXECUTION
                  </span>

                  {activities.length === 0 ? (
                    <>
                      <strong>No executions yet</strong>
                      <span>
                        Your agent activity will appear here.
                      </span>
                    </>
                  ) : (
                    <>
                      <strong>{activities[0].title}</strong>
                      <span>{activities[0].amount}</span>
                    </>
                  )}
                </div>
              </aside>
            </div>
          </section>
        ) : activePage === "Market Data" ? (
          <MarketDataPage onExecuted={logActivity} />
        ) : activePage === "Wallet" ? (
          <WalletPage />
        ) : activePage === "Swap" ? (
          <SwapPage onExecuted={logActivity} />
        ) : activePage === "Transfer" ? (
          <TransferPage onExecuted={logActivity} />
        ) : activePage === "x402 Payments" ? (
          <X402Page onExecuted={logActivity} />
        ) : activePage === "Activity" ? (
          <ActivityPage activities={activities} />
        ) : activePage === "Developer" ? (
          <DeveloperPage />
        ) : (
          <section className="content overview-page">
            <div className="overview-heading">
              <div>
                <span className="eyebrow">FINANCIAL WORKSPACE</span>
                <h1>Your financial overview</h1>
                <p>
                  Monitor your testnet portfolio and let your agent handle
                  execution when you need it.
                </p>
              </div>

              <button
                className="overview-agent-button"
                onClick={() => setActivePage("AI Agent")}
              >
                <span>✦</span>
                Ask your agent
              </button>
            </div>

            <div className="balance-card">
              <div className="balance-main">
                <span className="card-label">
                  TOTAL PORTFOLIO VALUE
                </span>

                <div className="balance-value">
                  $1,248.32
                </div>

                <span className="demo-note">
                  Demo portfolio · Avalanche Fuji testnet
                </span>
              </div>

              <div className="balance-assets">
                <div>
                  <span>USDC</span>
                  <strong>842.10</strong>
                  <small>$842.10</small>
                </div>

                <div>
                  <span>USDT</span>
                  <strong>406.22</strong>
                  <small>$406.22</small>
                </div>
              </div>
            </div>

            <div className="grid overview-grid">
              <div className="card overview-market-card">
                <div className="card-heading">
                  <div>
                    <span className="card-label">
                      MARKET DATA
                    </span>

                    <h3>USDC / KES</h3>
                  </div>

                  <span className="live">
                    <span></span>
                    LIVE
                  </span>
                </div>

                <div className="rate">
                  <strong>
                    {overviewRate
                      ? overviewRate.rate
                      : overviewRateError
                      ? "—"
                      : "…"}
                  </strong>

                  <span>KES</span>
                </div>

                <div className="rate-footer">
                  <span>1 USDC</span>

                  <span>
                    {overviewRate
                      ? "Updated just now"
                      : overviewRateError
                      ? "Rate unavailable"
                      : "Loading market data…"}
                  </span>
                </div>
              </div>

              <div className="card overview-activity-card">
                <div className="card-heading">
                  <div>
                    <span className="card-label">
                      RECENT ACTIVITY
                    </span>

                    <h3>Latest executions</h3>
                  </div>

                  {activities.length > 0 && (
                    <button
                      className="text-button"
                      onClick={() => setActivePage("Activity")}
                    >
                      View all
                    </button>
                  )}
                </div>

                {activities.length === 0 ? (
                  <div className="empty-state overview-empty">
                    <strong>No executions yet</strong>
                    <span>
                      Your agent activity will appear here after your
                      first transaction or market request.
                    </span>
                  </div>
                ) : (
                  activities.slice(0, 3).map((item) => (
                    <div className="activity" key={item.id}>
                      <div className="activity-icon">
                        {item.icon}
                      </div>

                      <div>
                        <strong>{item.title}</strong>
                        <span>{item.detail}</span>
                      </div>

                      <b>{item.amount}</b>
                    </div>
                  ))
                )}
              </div>
            </div>

            <section className="dashboard-agent">
              <div className="dashboard-agent-copy">
                <div className="dashboard-agent-icon">
                  ✦
                </div>

                <div>
                  <span className="card-label">
                    AI FINANCIAL AGENT
                  </span>

                  <h3>Your financial operations, in plain language.</h3>

                  <p>
                    Ask for a rate, request a swap, send stablecoins,
                    or resolve an x402 payment. The agent turns your
                    request into an executable financial action.
                  </p>
                </div>
              </div>

              <button
                className="open-agent-button"
                onClick={() => setActivePage("AI Agent")}
              >
                Open AI Agent →
              </button>
            </section>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;