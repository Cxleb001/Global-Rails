function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ActivityPage({ activities }) {
  return (
    <section className="content activity-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">HISTORY</span>
          <h2>Activity</h2>
          <p>
            A record of transactions and actions executed during this
            session.
          </p>
        </div>

        <div className="activity-count">
          {activities.length}{" "}
          {activities.length === 1 ? "execution" : "executions"}
        </div>
      </div>

      <div className="activity-card">
        <div className="activity-card-header">
          <div>
            <span className="card-label">SESSION HISTORY</span>
            <h3>Recent activity</h3>
          </div>

          <span className="activity-live">
            <span />
            Live
          </span>
        </div>

        {activities.length === 0 ? (
          <div className="activity-empty">
            <div className="empty-icon">↗</div>

            <h3>No activity yet</h3>

            <p>
              Your completed AI agent actions, swaps, transfers, and
              x402 payments will appear here.
            </p>
          </div>
        ) : (
          <div className="activity-list">
            {activities.map((item) => (
              <div className="activity-item" key={item.id}>
                <div className="activity-icon">
                  {item.icon}
                </div>

                <div className="activity-main">
                  <strong>{item.title}</strong>

                  <span>
                    {item.detail}
                  </span>
                </div>

                <div className="activity-meta">
                  <strong>{item.amount}</strong>

                  <span>
                    {formatTime(item.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default ActivityPage;