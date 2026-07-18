import { useMemo } from 'react';

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(value);
}

function BudgetGoalsPage({ entries }) {
  const summary = useMemo(() => {
    const income = entries.reduce((sum, entry) => sum + (entry.type === 'income' ? entry.amount : 0), 0);
    const expense = entries.reduce((sum, entry) => sum + (entry.type === 'expense' ? entry.amount : 0), 0);
    const remaining = 1200 - expense;
    return { income, expense, remaining, savingsRate: income ? Math.max(0, Math.round(((income - expense) / income) * 100)) : 0 };
  }, [entries]);

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Budget & Goals</h1>
          <p>Keep your targets aligned with your spending habits.</p>
        </div>
      </header>

      <section className="stats-grid">
        <article className="stat-card">
          <div className="stat-card-header">
            <span>Monthly Budget</span>
            <span className="stat-icon">🎯</span>
          </div>
          <h2>{formatCurrency(1200)}</h2>
          <p>Target limit</p>
        </article>

        <article className="stat-card">
          <div className="stat-card-header">
            <span>Spent So Far</span>
            <span className="stat-icon expense">₹</span>
          </div>
          <h2>{formatCurrency(summary.expense)}</h2>
          <p>Current month activity</p>
        </article>

        <article className="stat-card">
          <div className="stat-card-header">
            <span>Remaining</span>
            <span className="stat-icon income">₹</span>
          </div>
          <h2>{formatCurrency(Math.max(0, summary.remaining))}</h2>
          <p>Budget left</p>
        </article>

        <article className="stat-card">
          <div className="stat-card-header">
            <span>Savings Rate</span>
            <span className="stat-icon">📈</span>
          </div>
          <h2>{summary.savingsRate}%</h2>
          <p>Recent trend</p>
        </article>
      </section>

      <section className="transactions-panel">
        <div className="transactions-header">
          <div>
            <h3>Budget Insight</h3>
          </div>
        </div>
        <div className="info-card">
          <p>{summary.expense > 1200 ? 'You have already exceeded your monthly target. Review the categories where your spending is growing.' : 'Your spending is within plan. Keep contributing to savings and avoid unnecessary purchases.'}</p>
          <p>Total income: {formatCurrency(summary.income)}</p>
          <p>Total expenses: {formatCurrency(summary.expense)}</p>
        </div>
      </section>
    </>
  );
}

export default BudgetGoalsPage;
