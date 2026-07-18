import { useMemo } from 'react';

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatMonthLabel(month) {
  const [year, monthIndex] = month.split('-');
  const date = new Date(Number(year), Number(monthIndex) - 1, 1);
  return new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(date);
}

function DashboardPage({ entries, monthFilter, setMonthFilter, darkMode, setDarkMode, openTransactionModal, handleClearAll, exportCsv, importCsv, trendChartRef, categoryChartRef, summary, monthlyTrend, categoryBreakdown, defaultBudget }) {
  const monthOptions = useMemo(() => {
    return [...new Set(entries.map((entry) => entry.date.slice(0, 7)))].sort((a, b) => b.localeCompare(a));
  }, [entries]);

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back! Here's your financial snapshot.</p>
        </div>

        <div className="topbar-actions">
          <button className="btn btn-ghost" type="button" onClick={() => setDarkMode((prev) => !prev)}>{darkMode ? 'Light Mode' : 'Dark Mode'}</button>
          <select className="month-select" aria-label="Select month filter" value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)}>
            <option value="all">All Time</option>
            {monthOptions.map((month) => (
              <option key={month} value={month}>{formatMonthLabel(month)}</option>
            ))}
          </select>
          <button className="btn btn-secondary" type="button" onClick={handleClearAll}>Clear All</button>
          <button className="btn btn-primary" type="button" onClick={() => openTransactionModal()}>+ Add Transaction</button>
        </div>
      </header>

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card-header">
            <span>Net Balance</span>
            <span className="stat-icon">💰</span>
          </div>
          <h2>{formatCurrency(summary.balance)}</h2>
          <p>All time statistics</p>
        </article>

        <article className="stat-card">
          <div className="stat-card-header">
            <span>Total Income</span>
            <span className="stat-icon income">₹</span>
          </div>
          <h2>{formatCurrency(summary.income)}</h2>
          <p>This month</p>
        </article>

        <article className="stat-card">
          <div className="stat-card-header">
            <span>Total Expenses</span>
            <span className="stat-icon expense">₹</span>
          </div>
          <h2>{formatCurrency(summary.expense)}</h2>
          <p>This month</p>
        </article>

        <article className="stat-card">
          <div className="stat-card-header">
            <span>Savings Rate</span>
            <span className="stat-icon">📈</span>
          </div>
          <h2>{summary.savings}%</h2>
          <p>Across selected period</p>
        </article>
      </section>

      <section className="chart-grid">
        <div className="chart-panel">
          <div className="chart-panel-header">
            <h3>Monthly Trend</h3>
            <p>Income vs expenses over time</p>
          </div>
          <canvas ref={trendChartRef} aria-label="Monthly trend chart" role="img" />
        </div>

        <div className="chart-panel">
          <div className="chart-panel-header">
            <h3>Expense Breakdown</h3>
            <p>Categories distribution for selected month</p>
          </div>
          <canvas ref={categoryChartRef} aria-label="Expense breakdown chart" role="img" />
        </div>
      </section>

      <section className="insights-grid">
        <article className="info-card progress-card">
          <div className="info-card-header">
            <div>
              <h3>Monthly Budget Tracker</h3>
              <p>Track your spending against your monthly target</p>
            </div>
            <strong>{formatCurrency(defaultBudget)}</strong>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${Math.min(100, Math.round((summary.expense / defaultBudget) * 100))}%` }} />
          </div>
          <p>{formatCurrency(Math.max(0, defaultBudget - summary.expense))} remaining of your monthly budget.</p>
        </article>

        <article className="info-card insight-card">
          <div className="info-card-header">
            <div>
              <h3>Smart Insight</h3>
              <p>A quick read on your current money health</p>
            </div>
          </div>
          <div className="insight-message">
            <strong>{summary.income <= 0 && summary.expense > 0 ? 'Track Income' : summary.expense === 0 && summary.income > 0 ? 'Great Start' : summary.income > summary.expense ? 'Healthy Budget' : 'Watch Expenses'}</strong>
            <p>{summary.income <= 0 && summary.expense > 0 ? 'You have expenses recorded but no income yet. Add income to balance your budget.' : summary.expense === 0 && summary.income > 0 ? 'Your income is recorded. Add a few expense entries to complete your financial snapshot.' : summary.income > summary.expense ? 'Your current income exceeds expenses. Keep it up and stay ahead of your goals.' : 'Expenses are higher than income. Review your spending categories and reduce unnecessary costs.'}</p>
          </div>
        </article>
      </section>

      <section className="transactions-panel">
        <div className="transactions-header">
          <div>
            <h3>Recent Transactions</h3>
          </div>
          <button className="btn btn-text" type="button" onClick={importCsv}>Import Backup</button>
        </div>

        <div className="table-container">
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-row">No transactions registered for this period.</td>
                </tr>
              ) : (
                entries.slice(0, 6).map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.date}</td>
                    <td>{entry.description}</td>
                    <td>{entry.category}</td>
                    <td><span className={`badge ${entry.type}`}>{entry.type}</span></td>
                    <td>{formatCurrency(entry.amount)}</td>
                    <td className="action-buttons">
                      <button className="btn btn-text" type="button" onClick={() => openTransactionModal(entry)}>Edit</button>
                      <button className="btn btn-text" type="button" onClick={() => requestDelete(entry.id)}>Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default DashboardPage;
