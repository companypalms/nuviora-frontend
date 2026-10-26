# 🎨 Nuviora Frontend (nuviora-frontend)

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Material UI](https://img.shields.io/badge/Material--UI-0081CB?style=for-the-badge&logo=mui&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-443E38?style=for-the-badge)

**Nuviora Frontend** is the high-performance, modern user interface for the Nuviora order management system. Built with **React 19** and **MUI 7**, it provides a premium experience for admins, sellers, and logistics teams.

---

## ✨ Features

### 📊 Real-Time Operations
- **Live Kanban Board:** Drag-and-drop order movement with real-time status updates via WebSocket (Laravel Echo).
- **Executive Dashboard:** Visual data representation using **Recharts** for sales performance, profitability, and delivery metrics.

### 🍱 Role-Tailored Interfaces
- **Admin Center:** Comprehensive management of users, agencies, and financial settlements.
- **Seller Portal:** Optimized for fast order entry, upselling flows, and customer history tracking.
- **Logistics View:** Dedicated mobile-responsive views for deliverers to manage their daily routes and stock.

### 🛠 Modern Infrastructure
- **State Management:** Lightweight and reactive stores powered by **Zustand**.
- **Theming:** Dynamic light/dark mode support with customized MUI components.
- **Forms:** Robust validation using **Formik** and detailed formatting with `react-number-format`.

---

## 🛠 Tech Stack

- **Core:** [React 19](https://react.dev)
- **Language:** TypeScript
- **UI Framework:** [Material UI 7](https://mui.com)
- **Routing:** React Router 7
- **Utilities:** date-fns, axios, react-toastify
- **Build Tool:** Vite

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm / pnpm

### Installation

1. **Clone the repository:**
   ```bash
   cd nuviora-frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Update your `.env` file with the API base URL:
   ```env
   VITE_API_URL=http://localhost:8000/api
   VITE_PUSHER_APP_KEY=your_key
   ```

4. **Run Development Server:**
   ```bash
   npm run dev
   ```

---

## 📂 Project Structure

- `/src/components`: Reusable UI components (Modals, Inputs, DataTables).
- `/src/pages`: Main application views (Kanban, Inventory, Reports).
- `/src/store`: Zustand state management modules.
- `/src/hooks`: Custom React hooks for data fetching and logic.
- `/src/theme`: Material UI theme configuration and design tokens.

---

<p align="center">
  Crafted for performance and visual excellence. 🚀
</p>
