# 💰 Expense Tracker

A clean, fast, and fully-featured **Expense Tracker** web application built with vanilla HTML, CSS, and JavaScript — no frameworks required.

---

## ✨ Features

| Feature | Details |
|---|---|
| **Add / Edit / Delete** | Full CRUD for income & expense transactions |
| **Transaction Fields** | Amount, Category, Date, Description |
| **Summary Cards** | Total Income, Total Expenses, Current Balance |
| **Monthly Summary** | Navigate month-by-month to see income, expenses & net |
| **Filter & Search** | Filter by type (income/expense), category, and free-text search |
| **Sort** | Newest, Oldest, Highest Amount, Lowest Amount |
| **Pagination** | 10 transactions per page |
| **LocalStorage** | Data persists across browser refreshes |
| **Dark Mode** | Toggle between light and dark themes (saved to storage) |
| **Category Chart** | Doughnut chart showing expense/income breakdown by category |
| **Monthly Trend Chart** | 6-month bar chart comparing income vs expenses |
| **Validation** | Inline field-level error messages with helpful hints |
| **Toast Notifications** | Feedback on add, edit, delete actions |
| **Responsive Design** | Works on desktop, tablet, and mobile |
| **Keyboard Shortcuts** | `Ctrl+K` opens the Add Transaction modal, `Esc` closes modals |

---

## 🚀 How to Run

This is a **pure front-end** application — no build step, no server, no installation required.

### Option 1 — Open directly in browser
1. Download or clone this repository
2. Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari)

```
double-click index.html
```

### Option 2 — Using VS Code Live Server
1. Install the [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
2. Right-click `index.html` → **Open with Live Server**

### Option 3 — Using Python's built-in server
```bash
# Python 3
python -m http.server 3000
# Then open http://localhost:3000
```

### Option 4 — Using Node.js `serve`
```bash
npx serve .
```

---

## 📁 Project Structure

```
expense-tracker-candidate-name/
├── index.html    # App shell and markup
├── style.css     # All styles (CSS variables, dark mode, responsive)
├── app.js        # All application logic
└── README.md     # This file
```

---

## 🎨 Tech Stack

- **HTML5** — Semantic markup, ARIA accessibility attributes
- **CSS3** — CSS custom properties (variables), Grid, Flexbox, animations
- **JavaScript (ES6+)** — Vanilla JS, no dependencies
- **Chart.js 4** — Category doughnut chart + monthly trend bar chart (loaded via CDN)
- **Google Fonts** — Inter typeface (loaded via CDN)
- **LocalStorage** — Client-side data persistence

---

## 💡 Usage Tips

- Sample data is pre-loaded on first run so you can explore all features immediately
- Click any transaction to see edit/delete buttons appear
- Use the **month navigation arrows** in the Monthly Summary to browse past months
- Toggle **dark mode** with the 🌙 button in the header
- Press **Ctrl+K** anywhere to quickly open the Add Transaction modal

---

## 📦 Categories

**Expense:** Food & Dining, Transport, Shopping, Utilities, Health & Medical, Entertainment, Education, Rent & Housing, Travel, Insurance, Personal Care, Other

**Income:** Salary, Freelance, Business, Investment, Rental Income, Gift / Bonus, Other

---

*Built as a submission for the Expense Tracker assignment.*
