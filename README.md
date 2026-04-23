# Finance Tracker

-- Test update
A production-ready offline-first personal finance tracking application.

## Features

- **Transactions Module** - Create, edit, and track income/expenses with category tagging
- **Dashboard** - Real-time balance overview, income vs expense charts, category breakdown
- **Search & Pagination** - Client-side search with debounced input and pagination
- **Loans Module** - Track lent/borrowed amounts with installment schedules
- **Recurring Transactions** - Dynamically computed virtual transactions based on rules
- **Data Safety** - Export/Import JSON backups and CSV export for transactions
- **100% Offline-First** - No backend, no authentication, no cloud dependency

## Tech Stack

- **Core**: Vite + React + TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Routing**: React Router
- **Storage**: Dexie.js (IndexedDB)
- **Mobile**: Capacitor (iOS/Android)

## Architecture

The app follows a strict layered architecture:

```
UI (React Components)
    ↓
Hooks / View Models
    ↓
Domain Services (Business Logic)
    ↓
Repository Layer (Unified API)
    ↓
Storage Adapters (IndexedDB / SQLite)
```

## Money Handling

All monetary values are stored as **integer cents** to avoid floating-point precision issues.

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

## Mobile Development & PWA Testing

### Native Apps (Capacitor)

```bash
# Add platforms
npx cap add ios
npx cap add android

# Sync web assets
npx cap sync

# Open native IDE
npx cap open ios    # or android
```

### PWA Testing on Mobile (HTTPS)

Since PWAs and IndexedDB require a secure context (HTTPS), use `localtunnel` (loca.lt) to test on your actual mobile device:

1. **Start the development server:**
   ```bash
   npm run dev
   ```
   *Note the port (usually `5173`).*

2. **Expose the port using localtunnel:**
   Open a new terminal and run:
   ```bash
   npx localtunnel --port 5173
   ```

3. **Access on Mobile:**
   - Copy the URL provided (e.g., `https://XXXX.loca.lt`).
   - Open it in your mobile browser (Safari on iOS, Chrome on Android).
   - Use "Add to Home Screen" to install it as a PWA.

### Production Build

To test the production-optimized version:

```bash
# Build the project
npm run build

# Preview locally
npm run preview

# Then expose the preview port (usually 4173)
npx localtunnel --port 4173
```

## Project Structure

```
src/
├── app/                 # Pages via React Router
├── components/
│   ├── ui/              # UI primitives (Button, Card, Modal, etc.)
│   ├── charts/          # Chart components
│   └── layout/          # Layout components (BottomNav, AppLayout)
├── domain/
│   ├── transactions/    # Transaction business logic
│   ├── loans/            # Loan business logic
│   ├── recurring/       # Recurring engine
│   └── dashboard/        # Dashboard engine
├── repositories/        # Repository interfaces
├── storage/             # Storage adapters (IndexedDB, SQLite)
├── hooks/               # React hooks
├── store/               # Zustand stores
├── lib/                 # Utility functions
└── types/               # TypeScript types
```

## License

MIT
