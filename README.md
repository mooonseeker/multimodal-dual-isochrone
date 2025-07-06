# Multimodal Dual Isochrone

## Modular Architecture

### File Structure

```plaintext
multimodal-dual-isochrone/
├── main.html            # Main HTML entry point
├── style.css            # CSS styles
├── scripts/             # JavaScript modules
│   ├── config.js        # API configuration and constants
│   ├── state.js         # Application state management
│   ├── mapService.js    # AMap API interactions
│   ├── ui.js            # UI event handling
│   └── main.js          # Application entry point
```

### Module Dependencies

```mermaid
flowchart TD
    main.js --> config.js
    main.js --> mapService.js
    main.js --> ui.js
    ui.js --> state.js
    ui.js --> mapService.js
    mapService.js --> state.js
    mapService.js --> config.js
```

### Key Features

- Modular JavaScript architecture (ES6 modules)
- Clear separation of concerns
- Centralized state management
- Configurable API settings
