/* ============================================================
   EXPENSE TRACKER — APP.JS
   ============================================================ */
'use strict';

/* ── Constants ─────────────────────────────────────────────── */
const STORAGE_KEY   = 'expenseTrackerData_v2';
const PAGE_SIZE     = 10;
const CURRENCY      = '₹';

const CATEGORY_MAP = {
  expense: [
    { id: 'food',          label: '🍔 Food & Dining',       emoji: '🍔' },
    { id: 'transport',     label: '🚗 Transport',            emoji: '🚗' },
    { id: 'shopping',      label: '🛍️ Shopping',             emoji: '🛍️' },
    { id: 'utilities',     label: '💡 Utilities',            emoji: '💡' },
    { id: 'health',        label: '🏥 Health & Medical',     emoji: '🏥' },
    { id: 'entertainment', label: '🎬 Entertainment',        emoji: '🎬' },
    { id: 'education',     label: '📚 Education',            emoji: '📚' },
    { id: 'rent',          label: '🏠 Rent & Housing',       emoji: '🏠' },
    { id: 'travel',        label: '✈️ Travel',               emoji: '✈️' },
    { id: 'insurance',     label: '🛡️ Insurance',            emoji: '🛡️' },
    { id: 'personal',      label: '💄 Personal Care',        emoji: '💄' },
    { id: 'other_exp',     label: '📦 Other',                emoji: '📦' },
  ],
  income: [
    { id: 'salary',        label: '💼 Salary',               emoji: '💼' },
    { id: 'freelance',     label: '💻 Freelance',            emoji: '💻' },
    { id: 'business',      label: '🏢 Business',             emoji: '🏢' },
    { id: 'investment',    label: '📈 Investment',           emoji: '📈' },
    { id: 'rental',        label: '🏠 Rental Income',        emoji: '🏠' },
    { id: 'gift',          label: '🎁 Gift / Bonus',         emoji: '🎁' },
    { id: 'other_inc',     label: '💰 Other',                emoji: '💰' },
  ]
};

const CHART_COLORS = [
  '#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6',
  '#8b5cf6','#ec4899','#14b8a6','#f97316','#06b6d4',
  '#84cc16','#a855f7'
];

/* ── State ──────────────────────────────────────────────────── */
let state = {
  transactions: [],
  filterType:     'all',
  filterCategory: 'all',
  searchQuery:    '',
  sortOrder:      'newest',
  currentPage:    1,
  editId:         null,
  deleteId:       null,
  viewMonth:      new Date(),   // displayed in monthly summary
  chartMode:      'expense',    // 'expense' | 'income'
  darkMode:       false,
};

let categoryChart = null;
let trendChart    = null;

/* ── Helpers ────────────────────────────────────────────────── */
const fmt = n =>
  CURRENCY + Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

const fmtDate = iso => {
  const [y, m, d] = iso.split('-');
  return new Date(+y, +m - 1, +d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const getCategoryInfo = (id) => {
  for (const type of ['expense','income']) {
    const found = CATEGORY_MAP[type].find(c => c.id === id);
    if (found) return found;
  }
  return { id, label: id, emoji: '📦' };
};

/* ── LocalStorage ───────────────────────────────────────────── */
const saveData = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    transactions: state.transactions,
    darkMode: state.darkMode,
  }));
};

const loadData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    state.transactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];
    state.darkMode = parsed.darkMode || false;
  } catch {
    state.transactions = [];
  }
};

/* ── DOM References ─────────────────────────────────────────── */
const $ = id => document.getElementById(id);

const el = {
  totalBalance:     $('totalBalance'),
  totalIncome:      $('totalIncome'),
  totalExpenses:    $('totalExpenses'),
  balanceSub:       $('balanceSub'),

  monthlyIncome:       $('monthlyIncome'),
  monthlyExpenses:     $('monthlyExpenses'),
  monthlyNet:          $('monthlyNet'),
  monthlySavingsRate:  $('monthlySavingsRate'),
  monthlyCount:        $('monthlyCount'),
  currentMonthLabel:   $('currentMonthLabel'),
  prevMonth:           $('prevMonth'),
  nextMonth:           $('nextMonth'),
  monthlyCatList:      $('monthlyCatList'),
  monthlyEmpty:        $('monthlyEmpty'),

  transactionsList: $('transactionsList'),
  emptyState:       $('emptyState'),
  pagination:       $('pagination'),

  searchInput:      $('searchInput'),
  filterType:       $('filterType'),
  filterCategory:   $('filterCategory'),
  sortOrder:        $('sortOrder'),

  modalOverlay:     $('modalOverlay'),
  modalTitle:       $('modalTitle'),
  transactionForm:  $('transactionForm'),
  transactionType:  $('transactionType'),
  editId:           $('editId'),
  expenseBtn:       $('expenseBtn'),
  incomeBtn:        $('incomeBtn'),
  transactionAmount:$('transactionAmount'),
  transactionDate:  $('transactionDate'),
  transactionCategory: $('transactionCategory'),
  transactionDescription: $('transactionDescription'),
  charCount:        $('charCount'),
  submitBtn:        $('submitBtn'),

  openModalBtn:     $('openModalBtn'),
  closeModalBtn:    $('closeModalBtn'),
  cancelBtn:        $('cancelBtn'),

  deleteOverlay:    $('deleteOverlay'),
  closeDeleteBtn:   $('closeDeleteBtn'),
  cancelDeleteBtn:  $('cancelDeleteBtn'),
  confirmDeleteBtn: $('confirmDeleteBtn'),

  themeToggle:      $('themeToggle'),
  toastContainer:   $('toastContainer'),

  categoryChart:    $('categoryChart'),
  trendChart:       $('trendChart'),
  chartEmpty:       $('chartEmpty'),
  chartLegend:      $('chartLegend'),
  catBars:          $('catBars'),
};

/* ── Toast ──────────────────────────────────────────────────── */
const showToast = (msg, type = 'success') => {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  el.toastContainer.appendChild(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 300);
  }, 3000);
};

/* ── Theme ──────────────────────────────────────────────────── */
const applyTheme = () => {
  document.documentElement.setAttribute('data-theme', state.darkMode ? 'dark' : 'light');
  el.themeToggle.textContent = state.darkMode ? '☀️' : '🌙';
};

const toggleTheme = () => {
  state.darkMode = !state.darkMode;
  applyTheme();
  saveData();
};

/* ── Category Select Options ─────────────────────────────────── */
const buildCategorySelect = (type) => {
  el.transactionCategory.innerHTML = '<option value="">Select category…</option>';
  CATEGORY_MAP[type].forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.label;
    el.transactionCategory.appendChild(opt);
  });
};

const buildFilterCategorySelect = () => {
  const current = el.filterCategory.value;
  el.filterCategory.innerHTML = '<option value="all">All Categories</option>';
  const allCats = [...CATEGORY_MAP.expense, ...CATEGORY_MAP.income];
  const usedIds = new Set(state.transactions.map(t => t.category));
  allCats.filter(c => usedIds.has(c.id)).forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.label;
    el.filterCategory.appendChild(opt);
  });
  el.filterCategory.value = current;
};

/* ── Derived Data ───────────────────────────────────────────── */
const getFiltered = () => {
  let list = [...state.transactions];

  if (state.filterType !== 'all') list = list.filter(t => t.type === state.filterType);
  if (state.filterCategory !== 'all') list = list.filter(t => t.category === state.filterCategory);
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    list = list.filter(t =>
      t.description.toLowerCase().includes(q) ||
      getCategoryInfo(t.category).label.toLowerCase().includes(q) ||
      t.amount.toString().includes(q)
    );
  }

  switch (state.sortOrder) {
    case 'newest':  list.sort((a,b) => new Date(b.date) - new Date(a.date)); break;
    case 'oldest':  list.sort((a,b) => new Date(a.date) - new Date(b.date)); break;
    case 'highest': list.sort((a,b) => b.amount - a.amount); break;
    case 'lowest':  list.sort((a,b) => a.amount - b.amount); break;
  }
  return list;
};

const getMonthlyData = (year, month) => {
  return state.transactions.filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
};

/* ── Summary Cards ──────────────────────────────────────────── */
const renderSummary = () => {
  const income  = state.transactions.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0);
  const expense = state.transactions.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);
  const balance = income - expense;

  el.totalIncome.textContent   = fmt(income);
  el.totalExpenses.textContent = fmt(expense);
  el.totalBalance.textContent  = (balance < 0 ? '-' : '') + fmt(balance);

  const n = state.transactions.length;
  el.balanceSub.textContent = n === 0 ? 'No transactions yet' :
    `${n} transaction${n !== 1 ? 's' : ''} total`;
};

/* ── Monthly Summary ─────────────────────────────────────────── */
const renderMonthlySummary = () => {
  const y = state.viewMonth.getFullYear();
  const m = state.viewMonth.getMonth();
  const monthlyTxns = getMonthlyData(y, m);

  const income  = monthlyTxns.filter(t => t.type === 'income').reduce((s,t)  => s + t.amount, 0);
  const expense = monthlyTxns.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0);
  const net     = income - expense;
  const savingsRate = income > 0 ? Math.round((net / income) * 100) : 0;

  el.monthlyIncome.textContent      = fmt(income);
  el.monthlyExpenses.textContent    = fmt(expense);
  el.monthlyNet.textContent         = (net < 0 ? '−' : '+') + fmt(net);
  el.monthlyNet.style.color         = net < 0 ? 'var(--clr-expense)' : 'var(--clr-income)';
  el.monthlySavingsRate.textContent = savingsRate + '%';
  el.monthlySavingsRate.style.color = savingsRate < 0 ? 'var(--clr-expense)'
                                    : savingsRate < 20 ? 'var(--clr-text-2)'
                                    : 'var(--clr-income)';
  el.monthlyCount.textContent = monthlyTxns.length;
  el.currentMonthLabel.textContent  = new Date(y, m).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  // ── Category breakdown table ──
  const expTxns = monthlyTxns.filter(t => t.type === 'expense');
  const catTotals = {};
  expTxns.forEach(t => { catTotals[t.category] = (catTotals[t.category] || 0) + t.amount; });
  const catEntries = Object.entries(catTotals).sort((a,b) => b[1] - a[1]);

  const hasExpenses = catEntries.length > 0;
  el.monthlyEmpty.style.display    = hasExpenses ? 'none' : 'block';
  el.monthlyCatList.style.display  = hasExpenses ? 'block' : 'none';

  if (hasExpenses) {
    el.monthlyCatList.innerHTML = catEntries.map(([catId, total], i) => {
      const cat = getCategoryInfo(catId);
      const pct = expense > 0 ? ((total / expense) * 100).toFixed(1) : 0;
      const color = CHART_COLORS[i % CHART_COLORS.length];
      return `
        <div class="mcat-row">
          <div class="mcat-left">
            <span class="mcat-dot" style="background:${color}"></span>
            <span class="mcat-name">${cat.label.replace(/^[^\s]+\s/, '')}</span>
          </div>
          <div class="mcat-right">
            <div class="mcat-bar-wrap">
              <div class="mcat-bar" style="width:${pct}%;background:${color}"></div>
            </div>
            <span class="mcat-pct">${pct}%</span>
            <span class="mcat-amount">${fmt(total)}</span>
          </div>
        </div>`;
    }).join('');
  }
};

/* ── Transactions List ──────────────────────────────────────── */
const renderTransactions = () => {
  const filtered = getFiltered();
  const total    = filtered.length;
  const pages    = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (state.currentPage > pages) state.currentPage = pages;

  const start = (state.currentPage - 1) * PAGE_SIZE;
  const paged = filtered.slice(start, start + PAGE_SIZE);

  el.transactionsList.innerHTML = '';

  if (paged.length === 0) {
    el.emptyState.classList.add('visible');
    el.pagination.innerHTML = '';
    return;
  }
  el.emptyState.classList.remove('visible');

  paged.forEach(txn => {
    const cat  = getCategoryInfo(txn.category);
    const item = document.createElement('div');
    item.className = `transaction-item ${txn.type}-row`;
    item.setAttribute('role', 'listitem');
    item.dataset.id = txn.id;

    const typeLabel = txn.type === 'income' ? '↑' : '↓';
    const catName   = cat.label.replace(/^[^\s]+\s/, '');

    item.innerHTML = `
      <div class="txn-icon ${txn.type}" role="img" aria-label="${txn.type}">${typeLabel}</div>
      <div class="txn-body">
        <div class="txn-desc">${escHtml(txn.description || catName)}</div>
        <div class="txn-meta">
          <span class="txn-category">${catName}</span>
          <span class="txn-date">${fmtDate(txn.date)}</span>
        </div>
      </div>
      <span class="txn-amount ${txn.type}">
        ${txn.type === 'expense' ? '−' : '+'}${fmt(txn.amount)}
      </span>
      <div class="txn-actions">
        <button class="txn-btn txn-btn-edit" data-action="edit" data-id="${txn.id}" aria-label="Edit transaction" title="Edit">✏️</button>
        <button class="txn-btn txn-btn-delete" data-action="delete" data-id="${txn.id}" aria-label="Delete transaction" title="Delete">🗑️</button>
      </div>
    `;
    el.transactionsList.appendChild(item);
  });

  renderPagination(pages);
};

const escHtml = s => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ── Pagination ─────────────────────────────────────────────── */
const renderPagination = (pages) => {
  if (pages <= 1) { el.pagination.innerHTML = ''; return; }

  let html = '';
  const p = state.currentPage;

  html += `<button class="page-btn" data-page="${p - 1}" ${p === 1 ? 'disabled' : ''} aria-label="Previous page">‹</button>`;

  const showPages = new Set([1, pages, p, p-1, p+1].filter(x => x >= 1 && x <= pages));
  const sorted = [...showPages].sort((a,b) => a-b);

  let prev = 0;
  sorted.forEach(pg => {
    if (prev && pg - prev > 1) html += `<span class="page-btn" style="border:none;background:transparent;cursor:default;">…</span>`;
    html += `<button class="page-btn ${pg === p ? 'active' : ''}" data-page="${pg}" aria-label="Page ${pg}" aria-current="${pg === p ? 'page' : 'false'}">${pg}</button>`;
    prev = pg;
  });

  html += `<button class="page-btn" data-page="${p + 1}" ${p === pages ? 'disabled' : ''} aria-label="Next page">›</button>`;
  el.pagination.innerHTML = html;
};

/* ── Charts ──────────────────────────────────────────────────── */
const renderCategoryChart = () => {
  const type = state.chartMode;
  const txns = state.transactions.filter(t => t.type === type);

  const totals = {};
  txns.forEach(t => { totals[t.category] = (totals[t.category] || 0) + t.amount; });

  const entries = Object.entries(totals).sort((a,b) => b[1] - a[1]);
  const total   = entries.reduce((s,[,v]) => s + v, 0);

  const hasData = entries.length > 0;
  el.chartEmpty.classList.toggle('visible', !hasData);

  if (categoryChart) categoryChart.destroy();

  if (!hasData) {
    el.chartLegend.innerHTML = '';
    el.catBars.innerHTML     = '';
    return;
  }

  const labels = entries.map(([k]) => getCategoryInfo(k).label.replace(/^[^\s]+\s/, ''));
  const data   = entries.map(([,v]) => v);
  const colors = CHART_COLORS.slice(0, entries.length);

  categoryChart = new Chart(el.categoryChart, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${fmt(ctx.parsed)} (${((ctx.parsed / total) * 100).toFixed(1)}%)`
          }
        }
      }
    }
  });

  // Legend
  el.chartLegend.innerHTML = entries.map(([k, v], i) => `
    <li>
      <span class="legend-dot" style="background:${CHART_COLORS[i]}"></span>
      <span class="legend-label">${getCategoryInfo(k).label.replace(/^[^\s]+\s/, '')}</span>
      <span class="legend-pct">${((v / total) * 100).toFixed(0)}%</span>
    </li>
  `).join('');

  // ── Horizontal category bars (visual breakdown) ──
  el.catBars.innerHTML = `
    <div class="cat-bars-title">Amount by Category</div>
    ${entries.map(([k, v], i) => {
      const pct   = ((v / total) * 100).toFixed(1);
      const color = CHART_COLORS[i % CHART_COLORS.length];
      const name  = getCategoryInfo(k).label.replace(/^[^\s]+\s/, '');
      return `
        <div class="cat-bar-row">
          <div class="cat-bar-label">
            <span class="cat-bar-name">${name}</span>
            <span class="cat-bar-amt">${fmt(v)}</span>
          </div>
          <div class="cat-bar-track">
            <div class="cat-bar-fill" style="width:${pct}%;background:${color}" title="${pct}%"></div>
          </div>
          <span class="cat-bar-pct">${pct}%</span>
        </div>`;
    }).join('')}
  `;
};

const renderTrendChart = () => {
  // Last 6 months
  const months = [];
  const incomes = [];
  const expenses = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const label = d.toLocaleDateString('en-IN', { month: 'short' });
    const txns = getMonthlyData(y, m);
    months.push(label);
    incomes.push(txns.filter(t => t.type === 'income').reduce((s,t) => s + t.amount, 0));
    expenses.push(txns.filter(t => t.type === 'expense').reduce((s,t) => s + t.amount, 0));
  }

  if (trendChart) trendChart.destroy();

  trendChart = new Chart(el.trendChart, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        { label: 'Income',  data: incomes,  backgroundColor: '#10b981aa', borderRadius: 6 },
        { label: 'Expense', data: expenses, backgroundColor: '#ef4444aa', borderRadius: 6 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { font: { size: 11 }, color: getComputedStyle(document.documentElement).getPropertyValue('--clr-text-2') } } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#94a3b8' } },
        y: {
          grid: { color: 'rgba(148,163,184,.15)' },
          ticks: {
            font: { size: 10 }, color: '#94a3b8',
            callback: v => CURRENCY + (v >= 1000 ? (v/1000).toFixed(0) + 'k' : v)
          }
        }
      }
    }
  });
};

/* ── Full Render ────────────────────────────────────────────── */
const render = () => {
  renderSummary();
  renderMonthlySummary();
  renderTransactions();
  buildFilterCategorySelect();
  renderCategoryChart();
  renderTrendChart();
};

/* ── Modal ───────────────────────────────────────────────────── */
const openModal = (edit = null) => {
  state.editId = edit ? edit.id : null;
  const isEdit = !!edit;

  el.modalTitle.textContent = isEdit ? 'Edit Transaction' : 'Add Transaction';
  el.submitBtn.textContent  = isEdit ? 'Save Changes'     : 'Add Transaction';
  el.editId.value           = isEdit ? edit.id : '';

  const type = isEdit ? edit.type : 'expense';
  setTypeToggle(type);
  buildCategorySelect(type);

  if (isEdit) {
    el.transactionAmount.value      = edit.amount;
    el.transactionDate.value        = edit.date;
    el.transactionCategory.value    = edit.category;
    el.transactionDescription.value = edit.description;
    updateCharCount();
  } else {
    el.transactionForm.reset();
    el.transactionDate.value = todayISO();
    el.charCount.textContent = '0 / 100';
  }

  clearFormErrors();
  // Reset valid state on all inputs
  ['transactionAmount','transactionDate','transactionCategory','transactionDescription'].forEach(id => {
    const inp = $(id);
    if (inp) { inp.classList.remove('valid'); inp.classList.remove('invalid'); }
  });
  el.modalOverlay.classList.add('open');
  el.transactionAmount.focus();
};

const closeModal = () => {
  el.modalOverlay.classList.remove('open');
  state.editId = null;
};

const setTypeToggle = (type) => {
  el.transactionType.value = type;
  el.expenseBtn.classList.toggle('active', type === 'expense');
  el.incomeBtn.classList.toggle('active',  type === 'income');
  buildCategorySelect(type);
};

/* ── Form Validation ─────────────────────────────────────────── */
const setFieldState = (inputId, errorId, hintId, errorMsg, hintMsg = '') => {
  const inp  = $(inputId);
  const errEl = $(errorId);
  const hintEl = hintId ? $(hintId) : null;
  if (errorMsg) {
    inp && inp.classList.add('invalid');
    inp && inp.classList.remove('valid');
    if (errEl) errEl.textContent = errorMsg;
  } else {
    inp && inp.classList.remove('invalid');
    inp && inp.classList.add('valid');
    if (errEl) errEl.textContent = '';
  }
  if (hintEl) hintEl.textContent = hintMsg;
};

const clearFormErrors = () => {
  ['transactionAmount','transactionDate','transactionCategory','transactionDescription'].forEach(id => {
    const inp = $(id);
    if (inp) { inp.classList.remove('invalid'); inp.classList.remove('valid'); }
  });
  ['amountError','dateError','categoryError'].forEach(id => { const e = $(id); if (e) e.textContent = ''; });
  ['amountHint','dateHint','descHint'].forEach(id => { const e = $(id); if (e) e.textContent = ''; });
};

const validateAmount = (live = false) => {
  const raw = el.transactionAmount.value.trim();
  const amount = parseFloat(raw);

  if (!raw) {
    if (!live) setFieldState('transactionAmount','amountError','amountHint','Amount is required. Enter how much was spent or received.');
    else setFieldState('transactionAmount','amountError','amountHint','','');
    return !live ? false : null;
  }
  if (isNaN(amount) || amount <= 0) {
    setFieldState('transactionAmount','amountError','amountHint','Enter a number greater than 0 (e.g. 500 or 1250.50).');
    return false;
  }
  if (amount < 1) {
    setFieldState('transactionAmount','amountError','amountHint','Minimum amount is ₹1. Did you mean a larger value?');
    return false;
  }
  if (amount > 10_000_000) {
    setFieldState('transactionAmount','amountError','amountHint','Amount exceeds ₹1 crore. Please double-check this value.');
    return false;
  }
  // Hint: show formatted preview
  const hint = `= ${fmt(amount)}`;
  setFieldState('transactionAmount','amountError','amountHint','', hint);
  return true;
};

const validateDate = (live = false) => {
  const val = el.transactionDate.value;
  if (!val) {
    if (!live) setFieldState('transactionDate','dateError','dateHint','Please select a date for this transaction.');
    else setFieldState('transactionDate','dateError','dateHint','','');
    return !live ? false : null;
  }
  const selected = new Date(val);
  const today    = new Date(); today.setHours(0,0,0,0);
  const minDate  = new Date('2000-01-01');

  if (selected > today) {
    setFieldState('transactionDate','dateError','dateHint','Future dates are not allowed. Select today or an earlier date.');
    return false;
  }
  if (selected < minDate) {
    setFieldState('transactionDate','dateError','dateHint','Date is too far in the past. Please check the year.');
    return false;
  }

  const diffDays = Math.floor((today - selected) / 86400000);
  let hint = '';
  if (diffDays === 0)       hint = 'Today';
  else if (diffDays === 1)  hint = 'Yesterday';
  else if (diffDays < 7)   hint = `${diffDays} days ago`;
  else if (diffDays < 31)  hint = `${Math.floor(diffDays/7)} week${Math.floor(diffDays/7)>1?'s':''} ago`;
  else if (diffDays < 365) hint = `${Math.floor(diffDays/30)} month${Math.floor(diffDays/30)>1?'s':''} ago`;
  setFieldState('transactionDate','dateError','dateHint','', hint);
  return true;
};

const validateCategory = (live = false) => {
  if (!el.transactionCategory.value) {
    if (!live) setFieldState('transactionCategory','categoryError', null,'Please choose a category for this transaction.');
    return !live ? false : null;
  }
  setFieldState('transactionCategory','categoryError', null,'');
  return true;
};

const validateDescription = () => {
  const val = el.transactionDescription.value.trim();
  const hintEl = $('descHint');

  if (val.length > 0 && val.length < 3) {
    if (hintEl) hintEl.textContent = 'Description is very short — add a few more words for clarity.';
  } else if (val.length >= 3) {
    if (hintEl) hintEl.textContent = '';
  } else {
    if (hintEl) hintEl.textContent = 'Optional — helps you identify this transaction later.';
  }
};

const validateForm = () => {
  const a = validateAmount(false);
  const d = validateDate(false);
  const c = validateCategory(false);
  return a && d && c;
};

const updateCharCount = () => {
  const len = el.transactionDescription.value.length;
  el.charCount.textContent = `${len} / 100`;
  const cc = $('charCount');
  if (cc) cc.style.color = len > 80 ? 'var(--clr-expense)' : len > 60 ? '#f59e0b' : '';
  validateDescription();
};

/* ── Submit ──────────────────────────────────────────────────── */
const handleSubmit = (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  const txn = {
    id:          state.editId || uid(),
    type:        el.transactionType.value,
    amount:      parseFloat(parseFloat(el.transactionAmount.value).toFixed(2)),
    date:        el.transactionDate.value,
    category:    el.transactionCategory.value,
    description: el.transactionDescription.value.trim(),
    createdAt:   state.editId
      ? state.transactions.find(t => t.id === state.editId)?.createdAt
      : Date.now(),
  };

  if (state.editId) {
    const idx = state.transactions.findIndex(t => t.id === state.editId);
    if (idx !== -1) state.transactions[idx] = txn;
    showToast('Transaction updated successfully!', 'success');
  } else {
    state.transactions.unshift(txn);
    showToast('Transaction added successfully!', 'success');
  }

  saveData();
  closeModal();
  render();
};

/* ── Delete ──────────────────────────────────────────────────── */
const openDeleteModal = (id) => {
  state.deleteId = id;
  el.deleteOverlay.classList.add('open');
};

const closeDeleteModal = () => {
  el.deleteOverlay.classList.remove('open');
  state.deleteId = null;
};

const confirmDelete = () => {
  if (!state.deleteId) return;
  state.transactions = state.transactions.filter(t => t.id !== state.deleteId);
  saveData();
  render();
  closeDeleteModal();
  showToast('Transaction deleted.', 'info');
};

/* ── Event Delegation (Transactions List) ────────────────────── */
el.transactionsList.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, id } = btn.dataset;
  if (action === 'edit') {
    const txn = state.transactions.find(t => t.id === id);
    if (txn) openModal(txn);
  } else if (action === 'delete') {
    openDeleteModal(id);
  }
});

/* ── Filter Events ───────────────────────────────────────────── */
el.searchInput.addEventListener('input', () => {
  state.searchQuery = el.searchInput.value.trim();
  state.currentPage = 1;
  renderTransactions();
});

el.filterType.addEventListener('change', () => {
  state.filterType = el.filterType.value;
  state.currentPage = 1;
  renderTransactions();
});

el.filterCategory.addEventListener('change', () => {
  state.filterCategory = el.filterCategory.value;
  state.currentPage = 1;
  renderTransactions();
});

el.sortOrder.addEventListener('change', () => {
  state.sortOrder = el.sortOrder.value;
  state.currentPage = 1;
  renderTransactions();
});

/* ── Pagination Events ───────────────────────────────────────── */
el.pagination.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-page]');
  if (!btn || btn.disabled) return;
  state.currentPage = parseInt(btn.dataset.page, 10);
  renderTransactions();
  el.transactionsList.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

/* ── Modal Events ────────────────────────────────────────────── */
el.openModalBtn.addEventListener('click',  () => openModal());
el.closeModalBtn.addEventListener('click', closeModal);
el.cancelBtn.addEventListener('click',     closeModal);

el.modalOverlay.addEventListener('click', (e) => {
  if (e.target === el.modalOverlay) closeModal();
});

el.transactionForm.addEventListener('submit', handleSubmit);

el.expenseBtn.addEventListener('click', () => setTypeToggle('expense'));
el.incomeBtn.addEventListener('click',  () => setTypeToggle('income'));

el.transactionDescription.addEventListener('input', updateCharCount);

/* ── Live Validation Events ──────────────────────────────────── */
el.transactionAmount.addEventListener('input',  () => validateAmount(true));
el.transactionAmount.addEventListener('blur',   () => validateAmount(false));
el.transactionDate.addEventListener('change',   () => validateDate(false));
el.transactionDate.addEventListener('input',    () => validateDate(true));
el.transactionCategory.addEventListener('change', () => validateCategory(false));
el.transactionDescription.addEventListener('focus', () => {
  const hintEl = $('descHint');
  if (hintEl && !el.transactionDescription.value.trim()) {
    hintEl.textContent = 'Optional — helps you identify this transaction later.';
  }
});

/* ── Delete Modal Events ─────────────────────────────────────── */
el.closeDeleteBtn.addEventListener('click',    closeDeleteModal);
el.cancelDeleteBtn.addEventListener('click',   closeDeleteModal);
el.confirmDeleteBtn.addEventListener('click',  confirmDelete);
el.deleteOverlay.addEventListener('click', (e) => {
  if (e.target === el.deleteOverlay) closeDeleteModal();
});

/* ── Keyboard Shortcuts ─────────────────────────────────────── */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (el.deleteOverlay.classList.contains('open')) closeDeleteModal();
    else if (el.modalOverlay.classList.contains('open')) closeModal();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    openModal();
  }
});

/* ── Monthly Nav ─────────────────────────────────────────────── */
el.prevMonth.addEventListener('click', () => {
  state.viewMonth = new Date(state.viewMonth.getFullYear(), state.viewMonth.getMonth() - 1);
  renderMonthlySummary();
});
el.nextMonth.addEventListener('click', () => {
  const next = new Date(state.viewMonth.getFullYear(), state.viewMonth.getMonth() + 1);
  if (next <= new Date()) {
    state.viewMonth = next;
    renderMonthlySummary();
  }
});

/* ── Chart Tab ───────────────────────────────────────────────── */
document.querySelectorAll('.chart-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.chart-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.chartMode = btn.dataset.chart;
    renderCategoryChart();
  });
});

/* ── Theme ───────────────────────────────────────────────────── */
el.themeToggle.addEventListener('click', toggleTheme);

/* ── Seed Sample Data (first run only) ──────────────────────── */
const seedSampleData = () => {
  if (state.transactions.length > 0) return;

  const today = new Date();
  const dateFor = (daysAgo) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().slice(0, 10);
  };

  state.transactions = [
    { id: uid(), type: 'income',  amount: 75000, date: dateFor(1),  category: 'salary',        description: 'Monthly salary',         createdAt: Date.now() },
    { id: uid(), type: 'expense', amount: 12000, date: dateFor(2),  category: 'rent',           description: 'Monthly rent',           createdAt: Date.now() },
    { id: uid(), type: 'expense', amount: 3200,  date: dateFor(3),  category: 'food',           description: 'Grocery shopping',       createdAt: Date.now() },
    { id: uid(), type: 'expense', amount: 1500,  date: dateFor(4),  category: 'transport',      description: 'Fuel & cab rides',       createdAt: Date.now() },
    { id: uid(), type: 'income',  amount: 15000, date: dateFor(5),  category: 'freelance',      description: 'Web design project',     createdAt: Date.now() },
    { id: uid(), type: 'expense', amount: 2800,  date: dateFor(6),  category: 'entertainment',  description: 'Movie & OTT',            createdAt: Date.now() },
    { id: uid(), type: 'expense', amount: 5600,  date: dateFor(7),  category: 'shopping',       description: 'Clothes',                createdAt: Date.now() },
    { id: uid(), type: 'expense', amount: 900,   date: dateFor(8),  category: 'health',         description: 'Medicines',              createdAt: Date.now() },
    { id: uid(), type: 'income',  amount: 3000,  date: dateFor(9),  category: 'investment',     description: 'Dividend received',      createdAt: Date.now() },
    { id: uid(), type: 'expense', amount: 1200,  date: dateFor(10), category: 'utilities',      description: 'Electricity bill',       createdAt: Date.now() },
    { id: uid(), type: 'expense', amount: 400,   date: dateFor(11), category: 'food',           description: 'Restaurant dinner',      createdAt: Date.now() },
    { id: uid(), type: 'expense', amount: 4500,  date: dateFor(35), category: 'travel',         description: 'Weekend trip',           createdAt: Date.now() },
    { id: uid(), type: 'income',  amount: 70000, date: dateFor(32), category: 'salary',         description: 'Previous month salary',  createdAt: Date.now() },
    { id: uid(), type: 'expense', amount: 2100,  date: dateFor(33), category: 'food',           description: 'Dining out',             createdAt: Date.now() },
    { id: uid(), type: 'expense', amount: 12000, date: dateFor(34), category: 'rent',           description: 'Monthly rent',           createdAt: Date.now() },
  ];
  saveData();
};

/* ── Init ────────────────────────────────────────────────────── */
const init = () => {
  loadData();
  seedSampleData();
  applyTheme();
  render();
};

init();
