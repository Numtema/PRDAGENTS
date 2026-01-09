
# Project Design Solver - Architecture (Node/Flow Edition)

This application uses a strictly decoupled **Node-based Service Layer** (PocketFlow logic) to transform fuzzy product ideas into high-fidelity design artifacts.

## 📂 Project Structure

```text
/
├── App.tsx             # State Management & View Orchestration
├── types.ts            # Domain Model (Expert Roles, Zod-backed Store)
├── services/
│   └── pocketFlow.ts   # GENAI ENGINE: Node-based flow with Zod validation
├── components/         # Material 3 View Layer
│   ├── ArtifactCard.tsx    # Card-based artifact visualizer
│   ├── SideDrawer.tsx      # Deep-dive interactive projection viewer
│   ├── AppMapViewer.tsx    # Architecture map visualizer
│   └── DottedBackground.tsx # Immersive environment
└── ARCHITECTURE.md     # Engineering specs
```

## 🧠 Service Logic: Node Pipeline

The `runDesignSolver` service executes a linear pipeline of specialized **Nodes**:

1.  **IntentNode**: Decrypts user input using **Gemini 3 Flash** with **Zod validation**.
2.  **CartographyNode**: Maps the application into priority modules.
3.  **ExpertTeamNode**: Runs 4 expert agents (UX, UI, Data, Component) in **parallel** to produce structured strategies.
4.  **SynthesisNode**: Generates 3 full-page interactive **HTML/Tailwind prototypes** as visual proposals.
5.  **ProjectionNode**: Performs a final consistency check and assembles a unified **UIFlash Project** JSON.

## 🛡️ Stability & Safety

-   **Schema First**: Every AI response is strictly validated via **Zod** schemas.
-   **Retry Logic**: Automatic exponential backoff for GenAI requests ensures robustness against rate limits or temporary failures.
-   **Safe JSON**: Custom regex-based JSON extraction handles model hallucinations (text wrapping).
-   **IP Safeguard**: Prompts explicitly prohibit artist or brand names, focusing on physical materiality and technical logic.

## 🛠 Tech Stack

-   **AI Core**: Google Gemini 3 Flash Preview (`@google/genai`).
-   **Logic**: TypeScript + Zod.
-   **UI**: React 19 + Lucide Icons + Tailwind CSS.
-   **Visuals**: Material Design 3 methodology.
