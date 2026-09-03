# Study Whiteboard

Study Whiteboard is a personal, non-commercial whiteboard for handwritten study notes. It is built with React, TypeScript, Vite, and the tldraw SDK.

## Features

- Infinite ruled-paper and blank canvas backgrounds
- Pen presets, fine thickness controls, highlighter, ruler, and partial-stroke erasing
- XP-Pen/stylus input and right-click-drag canvas panning
- Local boards with autosave and IndexedDB persistence
- Image insertion, drag and drop, and clipboard image paste
- Offline PDF import/rendering and PDF annotation
- PDF and PNG export
- Selection, lasso, shapes, notes, text, zoom, focus mode, undo, and redo

## Run locally

Requirements: Node.js and pnpm.

```bash
pnpm install
pnpm dev
```

The development server prints the local URL to open.

## Production build

tldraw requires an active trial, hobby, or commercial license for production use. Copy `.env.example` to `.env.local`, add your own public tldraw license key, and then build:

```bash
pnpm build
```

The generated `dist` directory is a standalone static production build. PDF.js, its worker, character maps, fonts, and WASM files are bundled under `public/pdfjs`, so PDF rendering does not require an internet connection.

## Privacy and storage

Boards are stored locally in the browser profile using localStorage and IndexedDB. This repository intentionally excludes local profiles, saved board databases, build output, test artifacts, binaries, dependency folders, and license keys.

## Licensing

This project depends on the tldraw SDK, which is distributed under the tldraw license and requires a valid license key for production use. Other third-party packages and bundled assets retain their respective licenses.
