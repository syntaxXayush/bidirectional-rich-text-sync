# Bidirectional Rich Text Sync

A robust, real-time bidirectional rich text synchronization system built with React, demonstrating cross-frame communication using the `postMessage` API. Built as part of the Educhunks Assessment.

## 🚀 Features

*   **Real-time Synchronization:** Type in Frame A, and watch it instantly mirror in Frame B (and vice-versa).
*   **Rich Text Formatting:** Full support for `Bold`, `Italic`, and `Strikethrough` syncing across isolated environments.
*   **Secure Message Broker:** The host dashboard acts as a central event broker, safely routing `postMessage` traffic between isolated iframes without direct DOM mutation.
*   **Live Event Log:** A built-in terminal-style event log that tracks all inbound, outbound, and relayed synchronization events in real-time.
*   **Local Persistence:** Editor states and event logs are persisted locally, so your work is safe across page reloads.
*   **State History:** Support for Undo (`Ctrl+Z`) and Redo (`Ctrl+Shift+Z`) synchronization.
*   **Modern UI:** A beautiful, responsive "IDE-style" dashboard with dark/light mode support, micro-animations, and a fully flex-based layout.

## 🛠️ Technology Stack

*   **Framework:** React 19 + Vite
*   **Styling:** Tailwind CSS (v4) with custom CSS variables for seamless theme switching
*   **Icons:** Lucide React
*   **Communication:** Window `postMessage` API & `structuredClone`
*   **Persistence:** LocalStorage API

## 📦 Getting Started

### Prerequisites
Make sure you have Node.js (v20+) installed.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/syntaxXayush/bidirectional-rich-text-sync.git
   ```
2. Navigate to the project directory:
   ```bash
   cd bidirectional-rich-text-sync
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to `http://localhost:5173`.

## 🏗️ Architecture

The application is structured into two main parts:
1.  **The Host Dashboard (`HostApp`):** Renders the main UI, manages the event log, and runs the `useMessageBroker` hook to route messages between iframes.
2.  **The Editor Iframes (`EditorApp` / `RichTextEditor`):** Isolated execution environments that handle the actual `contentEditable` logic and broadcast their state to the host.

This separation of concerns ensures that the iframes remain isolated (simulating cross-origin environments) while the host maintains absolute control over the message routing logic.
