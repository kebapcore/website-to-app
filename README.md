# Website to App Builder

A cross-platform desktop application that converts any website into a native desktop app with advanced configuration options and automated packaging.

## Features

- Convert websites to desktop apps
- Advanced browser and window configuration
- Visual customization
- Metadata editing
- Automated packaging for Windows, Linux (DEB, AppImage)
- Save and load project configurations
- Real-time build logs and progress

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Start the application: `npm start`

## Usage

1. Launch the application
2. Enter the website URL and app details
3. Configure behavior, visuals, and metadata
4. Select build targets
5. Click "BUILD APPLICATION"
6. Wait for the build to complete
7. Find the packaged app in the output directory

## Configuration Options

### Project Settings
- Website URL
- App Name
- App Identifier (e.g., com.example.app)
- Version

### Behavior Configuration
- Browser: Cookies, Local Storage, Right Click, DevTools, User Agent, External Links, Downloads, Sandbox
- Window: Size, Resizable, Frame, Always on Top, Fullscreen, Transparent

### Visual Customization
- App Icon
- Window Title
- Theme Color
- Tray Icon

### Metadata
- Product Name
- Description
- Company
- Copyright
- License

### Build Targets
- Windows EXE Installer
- Linux DEB Package
- Linux AppImage

## Output Structure

```
/output
/app-name
├── app/
│   ├── main.js
│   ├── package.json
│   └── preload.js (if applicable)
├── installers/
│   ├── app-name Setup 1.0.0.exe (Windows)
│   ├── app-name_1.0.0_amd64.deb (Linux)
│   └── app-name-1.0.0.AppImage (Linux)
└── config-used.json
```

## Requirements

- Node.js
- npm
- For packaging: wine (on Linux for Windows builds), etc.

## Development

- Main process: `main.js`
- Renderer: `src/index.html`, `src/app.js`, `src/styles.css`

## License

MIT