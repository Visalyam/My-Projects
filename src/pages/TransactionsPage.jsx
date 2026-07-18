import { useMemo } from 'react';

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(value);
}

function TransactionsPage({ entries, openTransactionModal, requestDelete, exportCsv, monthFilter, setMonthFilter }) {
  const filteredEntries = useMemo(() => {
    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    if (monthFilter === 'all') return sorted;
    return sorted.filter((entry) => entry.date.startsWith(monthFilter));
  }, [entries, monthFilter]);

  const monthOptions = useMemo(() => {
    return [...new Set(entries.map((entry) => entry.date.slice(0, 7)))].sort((a, b) => b.localeCompare(a));
  }, [entries]);

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Transactions</h1>
          <p>Manage every income and expense entry in one place.</p>
        </div>
        <div className="topbar-actions">
          <select className="month-select" aria-label="Select month filter" value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)}>
            <option value="all">All Time</option>
            {monthOptions.map((month) => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
          <button className="btn btn-secondary" type="button" onClick={exportCsv}>Export Backup</button>
          <button className="btn btn-primary" type="button" onClick={() => openTransactionModal()}>+ Add Transaction</button>
        </div>
      </header>

      <section className="transactions-panel">
        <div className="transactions-header">
          <div>
            <h3>All Transactions</h3>
          </div>
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
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-row">No transactions found.</td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
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

export default TransactionsPage;
