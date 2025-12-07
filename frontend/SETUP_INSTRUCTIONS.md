# Frontend Setup Instructions

## What's Been Created

I've set up the complete React + TypeScript frontend structure for the UI Pipeline System. However, since Node.js is not installed on this system, you'll need to complete the installation on your local machine.

## Setup Steps on Your Machine

### 1. Install Node.js (if not already installed)

Download and install Node.js 16+ from: https://nodejs.org/

Verify installation:
```bash
node --version
npm --version
```

### 2. Install Dependencies

Navigate to the frontend directory and install all packages:

```bash
cd frontend
npm install
```

This will install:
- React 18.2.0
- TypeScript 4.9.5
- React Flow 11.10.0 (for node-based canvas)
- Zustand 4.4.0 (state management)
- Axios 1.6.0 (API client)
- React Query 5.0.0 (server state)
- Tailwind CSS 3.3.0 (styling)

### 3. Start Development Server

```bash
npm start
```

The app will run on http://localhost:3000

### 4. Verify Backend Connection

Make sure your backend is running:
```bash
cd ../backend
venv\Scripts\activate
python main.py
```

Backend should be at http://localhost:8000

## What to Expect

When you run `npm start`, you should see:

1. **Header** - With "UI Pipeline System" title and Run/Stop buttons
2. **Left Panel** - Node Palette (placeholder for now)
3. **Center Canvas** - Main area (placeholder with ⚙️ icon)
4. **Right Panel** - Properties panel (placeholder)
5. **Bottom Panel** - Console with tabs

Everything uses a dark theme matching VS Code aesthetic.

## Files Created

### Configuration Files:
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.js` - Custom dark theme colors
- `postcss.config.js` - PostCSS configuration
- `.env` - Environment variables (API URL)
- `.gitignore` - Git ignore rules

### Source Files:
- `src/types/index.ts` - TypeScript type definitions
- `src/store/pipelineStore.ts` - Pipeline state (nodes, edges, tabs)
- `src/store/uiStore.ts` - UI state (panels, console logs)
- `src/api/client.ts` - Axios API client with interceptors
- `src/api/endpoints.ts` - All backend API endpoints
- `src/utils/nodeUtils.ts` - Helper functions for nodes
- `src/App.tsx` - Main application layout
- `src/index.tsx` - React entry point
- `src/index.css` - Global styles with Tailwind

### Directory Structure:
```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── api/
│   ├── components/
│   │   ├── canvas/      (empty, for Day 14-15)
│   │   ├── panels/      (empty, for Day 16-17)
│   │   └── toolbar/     (empty)
│   ├── hooks/           (empty, for Day 18-19)
│   ├── store/
│   ├── types/
│   ├── utils/
│   ├── App.tsx
│   ├── index.tsx
│   └── index.css
├── .env
├── package.json
└── README.md
```

## Next Development Steps (Day 12-20)

After successful setup, we'll implement:

- **Day 12-13**: Complete layout with resizable panels, tab management
- **Day 14-15**: React Flow canvas integration with custom nodes
- **Day 16-17**: Node Palette, Properties Panel, Console
- **Day 18-19**: API integration with React Query, WebSocket connection
- **Day 20**: E2E testing and polish

## Troubleshooting

### Installation Fails
```bash
# Clear npm cache
npm cache clean --force
npm install
```

### Port 3000 in use
```bash
# Use different port
set PORT=3001
npm start
```

### CORS Errors
Backend CORS is already configured for http://localhost:3000 in `backend/core/config.py`

## Current Status

✅ **Completed (Day 11):**
- Project structure created
- All configuration files
- Type definitions
- State management stores
- API client setup
- Utility functions
- Basic layout component

📋 **Ready for:**
- npm install
- npm start
- Begin Day 12 implementation

## Notes

This setup follows the implementation plan in `.docs/10-implementation-plan.md`. The backend is fully functional and ready to connect with the frontend once you install the dependencies.
