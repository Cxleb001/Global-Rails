import { useEffect, useState } from "react";
import { listTools } from "../api";

function DeveloperPage() {
  const [tools, setTools] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    listTools()
      .then((data) => {
        if (!cancelled) setTools(data.tools || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="content developer-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">DEVELOPERS</span>
          <h2>Developer tools</h2>
          <p>
            Explore the live tools available to your financial agent
            through REST and MCP.
          </p>
        </div>

        <div className="developer-status">
          <span />
          API connected
        </div>
      </div>

      <div className="developer-grid">
        <div className="developer-main">
          <div className="developer-card">
            <div className="developer-card-header">
              <div>
                <span className="card-label">API REFERENCE</span>
                <h3>Available tools</h3>
              </div>

              {tools && (
                <span className="tool-count">
                  {tools.length}{" "}
                  {tools.length === 1 ? "tool" : "tools"}
                </span>
              )}
            </div>

            {error && (
              <div className="status-message error-message">
                <span>!</span>

                <div>
                  <strong>Couldn't load tool catalog</strong>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {!tools && !error && (
              <div className="developer-loading">
                <span className="button-spinner" />
                Loading tool catalog...
              </div>
            )}

            {tools && tools.length === 0 && (
              <div className="developer-empty">
                <strong>No tools registered</strong>
                <p>
                  The backend did not return any available tools.
                </p>
              </div>
            )}

            {tools && tools.length > 0 && (
              <div className="tool-list">
                {tools.map((tool, index) => (
                  <div className="tool-doc" key={tool.name}>
                    <div className="tool-header">
                      <div className="tool-number">
                        {String(index + 1).padStart(2, "0")}
                      </div>

                      <div className="tool-identity">
                        <code>{tool.name}</code>
                        <span>Agent tool</span>
                      </div>
                    </div>

                    <p className="tool-description">
                      {tool.description}
                    </p>

                    <div className="endpoint-label">
                      REST endpoint
                    </div>

                    <pre className="tool-code">
                      <code>{`curl -X POST /api/tool/${tool.name} \\
  -H "Content-Type: application/json" \\
  -d '{ ... }'`}</code>
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="developer-side">
          <div className="developer-side-card">
            <span className="card-label">INTEGRATION</span>

            <h3>Built for agents</h3>

            <p>
              Global Rails exposes the same financial capabilities
              through multiple interfaces.
            </p>

            <div className="integration-item">
              <span>REST</span>
              <div>
                <strong>/api/tool</strong>
                <p>Direct HTTP tool execution</p>
              </div>
            </div>

            <div className="integration-item">
              <span>MCP</span>
              <div>
                <strong>/api/mcp</strong>
                <p>Connect AI clients to your tools</p>
              </div>
            </div>
          </div>

          <div className="developer-side-card">
            <span className="card-label">ARCHITECTURE</span>

            <div className="architecture-flow">
              <div>
                <span>01</span>
                <strong>AI Agent</strong>
              </div>

              <div className="flow-line" />

              <div>
                <span>02</span>
                <strong>Tool Layer</strong>
              </div>

              <div className="flow-line" />

              <div>
                <span>03</span>
                <strong>Financial APIs</strong>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default DeveloperPage;