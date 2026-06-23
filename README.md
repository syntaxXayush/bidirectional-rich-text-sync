<div align="center">

  # 🔄 Bidirectional Rich Text Sync — Educhunks Assessment

  **Real-time Cross-Frame Synchronization · Secure Message Broker · Local Persistence**

  [![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
  [![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
  [![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

  <br />

  *A robust, real-time rich text synchronization system demonstrating secure cross-origin communication using the `postMessage` API across isolated execution environments.*

</div>

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Design Decisions](#-design-decisions)

---

## 🎯 Overview

**Bidirectional Rich Text Sync** is a sophisticated frontend assessment project designed to solve complex state synchronization across isolated browser frames. By utilizing the `postMessage` API, it safely routes rich text data, formatting commands, and selection states between two independent iframes (`Frame A` and `Frame B`) via a central Host Dashboard.

The platform simulates a strict cross-origin environment where iframes cannot directly access each other's DOM or global state.

> **North Star Metric:** Zero-latency Synchronization — ensuring sub-100ms bidirectional syncs without infinite loops or race conditions.

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| ⚡ **Real-Time Sync** | Millisecond-latency synchronization of HTML content across isolated frames |
| 🛡️ **Secure Broker** | Central host router that securely validates and forwards `postMessage` payloads |
| 🔤 **Rich Formatting** | Full cross-frame support for Bold, Italic, and Strikethrough toggles |
| 📜 **Live Event Log** | Terminal-style event stream showing real-time `tail -f` network traffic |
| 🔄 **Undo/Redo Support** | Synchronized state history (`Ctrl+Z` / `Ctrl+Shift+Z`) across environments |
| 💾 **Local Persistence** | Editor states survive page reloads utilizing the LocalStorage API |
| 🎨 **Premium UI/UX** | IDE-inspired aesthetics, smooth micro-animations, and full dark/light mode support |
| 🛑 **Loop Prevention** | Intelligent SHA hashing and sequence ID checks to prevent infinite broadcast loops |

---

## 🏗️ System Architecture

<p align="center">
  <br/>
  <i>Host Dashboard acts as the central event bus for isolated iframe environments.</i>
  <br/>
</p>

### Data Flow

```text
    [ IFRAME A ]                                         [ IFRAME B ]
    RichTextEditor                                      RichTextEditor
          │                                                   ▲
          │ (1) contentEditable Input                         │ (4) applyRemoteHtml()
          ▼                                                   │
  postMessage({ type: 'CONTENT_SYNC' })           window.addEventListener('message')
          │                                                   ▲
          └─────────────▶  [ HOST DASHBOARD ]  ───────────────┘
                            useMessageBroker
                                  │
                                  ▼ (2) Validate Origin
                                  ▼ (3) Log to EventLogPanel
                                  ▼ (4) Relay to Target Iframe
```

---

## 💻 Tech Stack

### Core Framework
| Technology | Purpose |
|-----------|---------|
| **React 19** | UI library leveraging modern hooks (`useRef`, `useCallback`) |
| **Vite 6** | Ultra-fast development server and production bundler |
| **TypeScript** | Strict typing for `postMessage` payload contracts |

### Styling & UI
| Technology | Purpose |
|-----------|---------|
| **Tailwind CSS v4** | Utility-first CSS for rapid, responsive layout creation |
| **Vanilla CSS3** | Custom properties (CSS variables) for dynamic dark mode |
| **Lucide React** | Scalable, clean SVG iconography |

### Architecture
| Technology | Purpose |
|-----------|---------|
| **postMessage API** | Secure cross-document messaging |
| **structuredClone** | Deep payload copying |
| **LocalStorage** | Persistent state management |

---

## 📁 Project Structure

```text
bidirectional-rich-text-sync/
│
├── 📁 src/
│   ├── 📁 editor/                   # Iframe Execution Environment
│   │   ├── components/
│   │   │   ├── RichTextEditor.tsx   # Core contentEditable logic & sync
│   │   │   └── Toolbar.tsx          # Formatting controls
│   │   ├── EditorApp.tsx            # Iframe entry component
│   │   └── main.tsx                 # Iframe DOM mount
│   │
│   ├── 📁 host/                     # Main Dashboard Environment
│   │   ├── components/
│   │   │   ├── EditorFramePanel.tsx # Iframe wrapper & lifecycle
│   │   │   ├── EventLogPanel.tsx    # Live terminal traffic view
│   │   │   └── SyncStatusBar.tsx    # Connection health metrics
│   │   ├── hooks/
│   │   │   └── useMessageBroker.ts  # postMessage routing & deduplication
│   │   ├── HostApp.tsx              # Main dashboard layout
│   │   └── main.tsx                 # Host DOM mount
│   │
│   ├── 📁 shared/                   # Shared Business Logic & Contracts
│   │   ├── protocol.ts              # Sync IDs, timestamps, payload builders
│   │   ├── types.ts                 # Strict TypeScript interfaces
│   │   ├── persistence.ts           # LocalStorage adapters
│   │   ├── exportUtils.ts           # JSON/HTML export utilities
│   │   └── selectionUtils.ts        # Cursor offset calculations
│   │
│   └── index.css                    # Global design tokens and tailwind imports
│
├── index.html                       # Host Dashboard Entry HTML
├── editor.html                      # Iframe Entry HTML
├── vite.config.ts                   # Multi-page application setup
└── package.json                     # Dependencies & Scripts
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** ≥ 20.0

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/syntaxXayush/bidirectional-rich-text-sync.git
cd bidirectional-rich-text-sync

# Install dependencies
npm install
```

### 2. Launch Development Server

```bash
# Start the Vite dev server
npm run dev
```

### 3. Open the Dashboard

Navigate to **[http://localhost:5173](http://localhost:5173)** in your browser.

- Type in **Frame A** and watch it instantly appear in **Frame B**.
- Use `Ctrl+B` or `Ctrl+I` to test synchronized formatting.
- Watch the **Host Event Log** capture the cross-frame traffic in real-time.
- Switch between Light and Dark mode using the toggle in the top right.

---

## 🧠 Design Decisions

### Why `postMessage` over React Context?
While React Context is perfect for state sharing within a single component tree, this assessment simulates strict **cross-origin browser environments**. Iframes cannot access a shared React Context. The `postMessage` API ensures the solution scales to real-world scenarios where frames are hosted on entirely different domains.

### Why `contentEditable` over Draft.js / Quill?
To demonstrate a deep understanding of DOM manipulation and selection APIs. Managing raw `contentEditable` requires manual handling of cursor offsets and HTML normalization, proving a stronger grasp of browser fundamentals than relying on a heavy third-party WYSIWYG library.

### Loop Prevention Strategy
Bidirectional sync inherently risks infinite loops (A updates B → B updates A → ad infinitum). This is solved using:
1. **Sync ID Tracking:** Every operation generates a unique hash. The receiver checks `lastAppliedSyncIdRef` before applying.
2. **Execution Guards:** A strict `isRemoteUpdateRef` flag prevents the `onInput` handler from broadcasting events triggered by a remote payload application.
3. **HTML Normalization:** Comparing DOM strings requires normalization to prevent false positives caused by minor browser-specific HTML serialization differences.

---

<div align="center">
  <br />

  <sub>Frontend Architecture · Cross-Origin Communication · Advanced React</sub>

  <br /><br />
</div>
