# Manufacturer ERP

React + Tailwind app packaged as a Windows desktop app with Electron.

## Requirements
- Node.js 18 or newer (https://nodejs.org)
- VS Code

## Run it
Open this folder in VS Code, open the terminal (Ctrl + `), then:

    npm install
    npm run dev        # runs in your browser at http://localhost:5173
    npm start          # runs as a desktop window (Electron)

## Build the .exe (run on Windows)

    npm run dist

Output goes to the `release` folder:
- `Manufacturer ERP Setup 1.0.0.exe`  (installer)
- `Manufacturer ERP 1.0.0.exe`        (portable, no install)

Data is saved in the app's local storage on that computer.
