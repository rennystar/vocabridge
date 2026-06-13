# VocaBridge

![VocaBridge mark](src/assets/images/logo-mark.png)

VocaBridge is a compact desktop dictionary for people who read, write, and translate with a keyboard in front of them. It opens fast, keeps the search field ready, and gets out of the way once you have the definition, pronunciation, and example sentences you need.

Built with Tauri, Rust, React, and TypeScript, the app is designed to feel native without turning a quick lookup into a browser tab.

## Highlights

- Keyboard-first lookup flow with auto-focus and debounce timing
- Pronunciation playback for available dictionary audio
- Lookup history with filtering, CSV export, and clear controls
- Separate settings and history windows that stay out of the main lookup flow
- Example display controls for dense reading sessions or detailed study
- Optional Korean 2-set keyboard conversion for accidental layout input
- Free Dictionary API support for public builds
- Optional Cambridge source for local personal builds

## Screens

- Main lookup window for quick word searches
- History window for revisiting recent lookups
- Settings window for display density, source, audio, hotkey, and behavior preferences

## Build Modes

The public build uses the Free Dictionary API only:

```bash
npm run tauri:build:public
```

Local personal builds can enable the optional Cambridge source through the Rust feature flag in `src-tauri/Cargo.toml`.

## Development

Requirements:

- Node.js 20+
- Rust stable
- Platform prerequisites for Tauri 2

Install dependencies:

```bash
npm ci
```

Run the desktop app:

```bash
npm run tauri -- dev
```

Run checks:

```bash
npm run build
npm run test:run
cargo check --manifest-path src-tauri/Cargo.toml
```

Check the public Rust build path:

```bash
cargo check --manifest-path src-tauri/Cargo.toml --no-default-features
```

## Releases

Prototype builds are unsigned. macOS users may need to allow the app manually, and Windows users may need the Microsoft WebView2 runtime if it is not already installed.

## License

MIT
