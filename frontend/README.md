# UI Pipeline System - Frontend

React + TypeScript frontend for the UI Pipeline System.

## Prerequisites

- Node.js 16+ and npm
- Backend server running on http://localhost:8000

## Installation

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

## Running the Application

Start the development server:
```bash
npm start
```

The application will open at [http://localhost:3000](http://localhost:3000).

## Project Structure

```
frontend/
├── public/
│   └── index.html          # HTML template
├── src/
│   ├── api/                # API client and endpoints
│   │   ├── client.ts       # Axios configuration
│   │   └── endpoints.ts    # API endpoint definitions
│   ├── components/         # React components
│   │   ├── canvas/         # React Flow canvas components
│   │   ├── panels/         # Side panels (palette, properties, console)
│   │   └── toolbar/        # Toolbar components
│   ├── hooks/              # Custom React hooks
│   ├── store/              # Zustand state management
│   │   ├── pipelineStore.ts  # Pipeline state (nodes, edges)
│   │   └── uiStore.ts        # UI state (panels, modals)
│   ├── types/              # TypeScript type definitions
│   │   └── index.ts
│   ├── utils/              # Utility functions
│   │   └── nodeUtils.ts    # Node helpers and colors
│   ├── App.tsx             # Main app component
│   ├── index.tsx           # Entry point
│   └── index.css           # Global styles with Tailwind
├── .env                    # Environment variables
├── package.json
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── README.md
```

## Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **React Flow** - Node-based editor (to be integrated in Day 14-15)
- **Zustand** - State management
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **React Query** - Server state management

## Available Scripts

### `npm start`
Runs the app in development mode on port 3000.

### `npm test`
Launches the test runner (tests to be added).

### `npm run build`
Builds the app for production to the `build` folder.

## Configuration

### Environment Variables

Create or edit `.env` file:

```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000/ws
```

### Tailwind Theme

Custom colors defined in `tailwind.config.js`:

- **darkbg**: `#1e1e1e` - Main background
- **darkpanel**: `#252526` - Panel background
- **darkborder**: `#3e3e42` - Border color
- **primary**: `#007acc` - Primary action color
- **Pin colors**:
  - Trigger: White `#ffffff`
  - Number: Blue `#4a9eff`
  - String: Gold `#ffd700`
  - Boolean: Green `#4ade80`
  - Image: Red `#ef4444`

## Development Status

### Completed (Day 11):
- ✅ Project structure created
- ✅ TypeScript configuration
- ✅ Tailwind CSS setup with dark theme
- ✅ Zustand stores (pipelineStore, uiStore)
- ✅ API client with axios
- ✅ Type definitions
- ✅ Utility functions
- ✅ Basic App layout (placeholder)

### Next Steps (Day 12-20):
- 🔲 Day 12-13: Complete layout with resizable panels
- 🔲 Day 14-15: Integrate React Flow canvas
- 🔲 Day 16-17: Implement side panels (Node Palette, Properties, Console)
- 🔲 Day 18-19: API integration with React Query hooks
- 🔲 Day 20: E2E testing and polish

## Connecting to Backend

Ensure the backend server is running:

```bash
cd ../backend
venv/Scripts/activate  # Windows
python main.py
```

Backend should be accessible at:
- API: http://localhost:8000/api
- Swagger docs: http://localhost:8000/docs
- WebSocket: ws://localhost:8000/ws

## Troubleshooting

### Port 3000 already in use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Use different port
set PORT=3001 && npm start
```

### CORS errors
Ensure backend CORS is configured for `http://localhost:3000` in `backend/core/config.py`.

### Module not found errors
```bash
npm install
```

## Notes

- This is Phase 1 Week 3-4 frontend implementation
- React Flow integration scheduled for Day 14-15
- WebSocket connection will be implemented in Day 18-19
- All components use dark theme matching VS Code aesthetic
