import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { Chart, registerables } from 'chart.js';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import BudgetGoalsPage from './pages/BudgetGoalsPage';

Chart.register(...registerables);

const STORAGE_KEY = 'premiumBudgetTracker.entries';
const DEFAULT_BUDGET = 1200;
const categories = [
  'Food & Dining',
  'Rent & Utilities',
  'Transportation',
  'Entertainment',
  'Shopping',
  'Healthcare',
  'Travel',
  'Education',
  'Other',
];

const initialEntries = [];

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

function escapeCsv(value) {
  const stringValue = String(value ?? '');
  return /[",\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
}

function parseCsv(text) {
  const rows = [];
  let inQuotes = false;
  let row = [];
  let field = '';

  const pushField = () => {
    row.push(field);
    field = '';
  };

  const pushRow = () => {
    if (row.some((item) => item !== '')) rows.push(row);
    row = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (inQuotes && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      pushField();
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      pushField();
      pushRow();
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    pushField();
    pushRow();
  }

  if (!rows.length) return [];

  const [header, ...dataRows] = rows;
  return dataRows.map((values) => {
    const rowValues = header.reduce((acc, key, index) => {
      acc[key] = values[index] ?? '';
      return acc;
    }, {});

    return {
      id: rowValues.id || crypto.randomUUID(),
      type: rowValues.type || 'expense',
      amount: Number(rowValues.amount) || 0,
      description: rowValues.description || 'Imported entry',
      category: rowValues.category || 'Other',
      date: rowValues.date || new Date().toISOString().slice(0, 10),
      notes: rowValues.notes || '',
      createdAt: rowValues.createdAt || new Date().toISOString(),
    };
  }).filter((entry) => entry.amount > 0);
}

function App() {
  const [entries, setEntries] = useState(initialEntries);
  const [monthFilter, setMonthFilter] = useState('all');
  const [darkMode, setDarkMode] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [formState, setFormState] = useState({
    type: 'expense',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    category: categories[0],
    description: '',
    notes: '',
  });
  const fileInputRef = useRef(null);
  const trendChartRef = useRef(null);
  const categoryChartRef = useRef(null);
  const trendChartInstance = useRef(null);
  const categoryChartInstance = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setEntries(JSON.parse(stored));
      } catch {
        setEntries([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
  }, [darkMode]);

  const filteredEntries = useMemo(() => {
    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    if (monthFilter === 'all') return sorted;
    return sorted.filter((entry) => entry.date.startsWith(monthFilter));
  }, [entries, monthFilter]);

  const summary = useMemo(() => {
    const income = filteredEntries.reduce((sum, entry) => sum + (entry.type === 'income' ? entry.amount : 0), 0);
    const expense = filteredEntries.reduce((sum, entry) => sum + (entry.type === 'expense' ? entry.amount : 0), 0);
    const balance = income - expense;
    const savings = income ? Math.max(0, Math.round(((income - expense) / income) * 100)) : 0;
    return { income, expense, balance, savings };
  }, [filteredEntries]);

  const monthlyTrend = useMemo(() => {
    const months = [...new Set(entries.map((entry) => entry.date.slice(0, 7)))].sort();
    return months.map((month) => {
      const monthlyEntries = entries.filter((entry) => entry.date.startsWith(month));
      return {
        label: formatMonthLabel(month),
        income: monthlyEntries.reduce((sum, entry) => sum + (entry.type === 'income' ? entry.amount : 0), 0),
        expense: monthlyEntries.reduce((sum, entry) => sum + (entry.type === 'expense' ? entry.amount : 0), 0),
      };
    });
  }, [entries]);

  const categoryBreakdown = useMemo(() => {
    const map = filteredEntries.reduce((acc, entry) => {
      if (entry.type === 'expense') {
        acc[entry.category] = (acc[entry.category] || 0) + entry.amount;
      }
      return acc;
    }, {});
    return Object.entries(map);
  }, [filteredEntries]);

  useEffect(() => {
    if (!trendChartRef.current) return;
    if (trendChartInstance.current) {
      trendChartInstance.current.destroy();
    }
    trendChartInstance.current = new Chart(trendChartRef.current, {
      type: 'line',
      data: {
        labels: monthlyTrend.map((item) => item.label),
        datasets: [
          {
            label: 'Income',
            data: monthlyTrend.map((item) => item.income),
            borderColor: '#4f46e5',
            backgroundColor: 'rgba(79, 70, 229, 0.16)',
            tension: 0.35,
            fill: true,
          },
          {
            label: 'Expenses',
            data: monthlyTrend.map((item) => item.expense),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            tension: 0.35,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: darkMode ? '#e2e8f0' : '#334155' } },
        },
        scales: {
          x: { ticks: { color: darkMode ? '#cbd5e1' : '#64748b' }, grid: { display: false } },
          y: { ticks: { color: darkMode ? '#cbd5e1' : '#64748b' }, grid: { color: darkMode ? 'rgba(203,213,225,0.12)' : '#e2e8f0' } },
        },
      },
    });
  }, [monthlyTrend, darkMode]);

  useEffect(() => {
    if (!categoryChartRef.current) return;
    if (categoryChartInstance.current) {
      categoryChartInstance.current.destroy();
    }
    categoryChartInstance.current = new Chart(categoryChartRef.current, {
      type: 'doughnut',
      data: {
        labels: categoryBreakdown.length ? categoryBreakdown.map(([label]) => label) : ['No Expenses'],
        datasets: [
          {
            data: categoryBreakdown.length ? categoryBreakdown.map(([, value]) => value) : [1],
            backgroundColor: categoryBreakdown.length ? ['#6366f1', '#22c55e', '#f97316', '#ec4899', '#38bdf8', '#f59e0b', '#a855f7', '#fb7185'] : ['rgba(148, 163, 184, 0.4)'],
            borderColor: 'transparent',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: darkMode ? '#e2e8f0' : '#334155' } },
        },
      },
    });
  }, [categoryBreakdown, darkMode]);

  function resetForm() {
    setFormState({
      type: 'expense',
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      category: categories[0],
      description: '',
      notes: '',
    });
    setEditId(null);
  }

  function openTransactionModal(entry = null) {
    if (entry) {
      setEditId(entry.id);
      setFormState({
        type: entry.type,
        amount: entry.amount,
        date: entry.date,
        category: entry.category,
        description: entry.description,
        notes: entry.notes || '',
      });
    } else {
      resetForm();
    }
    setIsTransactionModalOpen(true);
  }

  function closeTransactionModal() {
    setIsTransactionModalOpen(false);
    resetForm();
  }

  function handleSubmit(event) {
    event.preventDefault();
    const amount = Number(formState.amount);
    if (!formState.description.trim() || Number.isNaN(amount) || amount <= 0 || !formState.date) {
      alert('Enter a valid amount, description, and date.');
      return;
    }

    const entry = {
      id: editId || crypto.randomUUID(),
      type: formState.type,
      amount,
      description: formState.description.trim(),
      category: formState.category,
      date: formState.date,
      notes: formState.notes.trim(),
      createdAt: new Date().toISOString(),
    };

    if (editId) {
      setEntries((current) => current.map((item) => (item.id === editId ? entry : item)));
    } else {
      setEntries((current) => [...current, entry]);
    }

    closeTransactionModal();
  }

  function handleDeleteConfirmed() {
    if (!deleteId) return;
    setEntries((current) => current.filter((entry) => entry.id !== deleteId));
    setDeleteId(null);
    setIsConfirmModalOpen(false);
  }

  function handleClearAll() {
    if (!entries.length) return;
    if (!window.confirm('Delete all transactions? This cannot be undone.')) return;
    setEntries([]);
  }

  function exportCsv() {
    if (!entries.length) {
      alert('No transactions to export.');
      return;
    }

    const header = ['id', 'type', 'amount', 'description', 'category', 'date', 'notes', 'createdAt'];
    const rows = entries.map((entry) => [
      entry.id,
      entry.type,
      entry.amount,
      escapeCsv(entry.description),
      escapeCsv(entry.category),
      entry.date,
      escapeCsv(entry.notes || ''),
      entry.createdAt,
    ]);

    const csvContent = [header, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'budget-transactions.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  function importCsv() {
    fileInputRef.current?.click();
  }

  function handleImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseCsv(reader.result);
        if (!parsed.length) {
          alert('No valid transactions found in the selected CSV file.');
          return;
        }
        setEntries(parsed);
        alert('Transactions imported successfully.');
      } catch {
        alert('Could not import CSV file. Please check the format.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  function requestDelete(id) {
    setDeleteId(id);
    setIsConfirmModalOpen(true);
  }

  return (
    <div className={`app-shell ${darkMode ? 'dark-mode' : ''}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">B</div>
          <div>
            <p className="brand-label">Budget Tracker</p>
            <span className="brand-subtitle">Premium</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => `nav-button ${isActive ? 'active' : ''}`} end>
            Dashboard
          </NavLink>
          <NavLink to="/transactions" className={({ isActive }) => `nav-button ${isActive ? 'active' : ''}`}>
            Transactions
          </NavLink>
          <NavLink to="/budget-goals" className={({ isActive }) => `nav-button ${isActive ? 'active' : ''}`}>
            Budget & Goals
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-btn" type="button" onClick={exportCsv}>Export Backup</button>
          <button className="sidebar-btn" type="button" onClick={importCsv}>Import Backup</button>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" hidden onChange={handleImportFile} />
          <p className="sidebar-note">Budget Tracker v1.0</p>
        </div>
      </aside>

      <main className="main-content">
        <Routes>
          <Route
            path="/"
            element={
              <DashboardPage
                entries={entries}
                monthFilter={monthFilter}
                setMonthFilter={setMonthFilter}
                darkMode={darkMode}
                setDarkMode={setDarkMode}
                openTransactionModal={openTransactionModal}
                handleClearAll={handleClearAll}
                importCsv={importCsv}
                trendChartRef={trendChartRef}
                categoryChartRef={categoryChartRef}
                summary={summary}
                monthlyTrend={monthlyTrend}
                categoryBreakdown={categoryBreakdown}
                defaultBudget={DEFAULT_BUDGET}
                requestDelete={requestDelete}
              />
            }
          />
          <Route
            path="/transactions"
            element={
              <TransactionsPage
                entries={entries}
                openTransactionModal={openTransactionModal}
                requestDelete={requestDelete}
                exportCsv={exportCsv}
                monthFilter={monthFilter}
                setMonthFilter={setMonthFilter}
              />
            }
          />
          <Route path="/budget-goals" element={<BudgetGoalsPage entries={entries} />} />
        </Routes>
      </main>

      {isTransactionModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div>
                <h3>{editId ? 'Edit Transaction' : 'Add New Transaction'}</h3>
              </div>
              <button className="modal-close" type="button" aria-label="Close modal" onClick={closeTransactionModal}>×</button>
            </div>
            <form className="modal-form" onSubmit={handleSubmit}>
              <div className="form-row split">
                <label>Transaction Type</label>
                <div className="toggle-group">
                  <label className={`toggle-option ${formState.type === 'expense' ? 'active' : ''}`}>
                    <input type="radio" name="transactionType" value="expense" checked={formState.type === 'expense'} onChange={() => setFormState((prev) => ({ ...prev, type: 'expense' }))} />
                    Expense
                  </label>
                  <label className={`toggle-option ${formState.type === 'income' ? 'active' : ''}`}>
                    <input type="radio" name="transactionType" value="income" checked={formState.type === 'income'} onChange={() => setFormState((prev) => ({ ...prev, type: 'income' }))} />
                    Income
                  </label>
                </div>
              </div>

              <div className="form-row">
                <label htmlFor="modalAmount">Amount (₹) *</label>
                <input id="modalAmount" name="amount" type="number" step="0.01" min="0.01" placeholder="0.00" required value={formState.amount} onChange={(event) => setFormState((prev) => ({ ...prev, amount: event.target.value }))} />
              </div>

              <div className="form-row split">
                <div>
                  <label htmlFor="modalDate">Date *</label>
                  <input id="modalDate" name="date" type="date" required value={formState.date} onChange={(event) => setFormState((prev) => ({ ...prev, date: event.target.value }))} />
                </div>
                <div>
                  <label htmlFor="modalCategory">Category *</label>
                  <select id="modalCategory" name="category" required value={formState.category} onChange={(event) => setFormState((prev) => ({ ...prev, category: event.target.value }))}>
                    {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <label htmlFor="modalDescription">Description / Vendor *</label>
                <input id="modalDescription" name="description" type="text" placeholder="e.g. Grocery, Salary payment" required value={formState.description} onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))} />
              </div>

              <div className="form-row">
                <label htmlFor="modalNotes">Notes (Optional)</label>
                <textarea id="modalNotes" name="notes" placeholder="Add additional details..." value={formState.notes} onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))} />
              </div>

              <div className="modal-actions">
                <button className="btn btn-text" type="button" onClick={closeTransactionModal}>Cancel</button>
                <button className="btn btn-primary" type="submit">Save Transaction</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isConfirmModalOpen && (
        <div className="modal-overlay">
          <div className="modal confirm-modal">
            <div className="modal-header">
              <div>
                <h3>Are you absolutely sure?</h3>
              </div>
            </div>
            <div className="confirm-body">
              <p>This action will delete this transaction forever. This cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button className="btn btn-text" type="button" onClick={() => { setDeleteId(null); setIsConfirmModalOpen(false); }}>Cancel</button>
              <button className="btn btn-danger" type="button" onClick={handleDeleteConfirmed}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
