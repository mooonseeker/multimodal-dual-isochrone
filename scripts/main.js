import { API_KEY, SECURITY_JS_CODE } from './config.js';
import { initializeMap } from './mapService.js';
import { setupUIEventListeners, setActiveInput, initialDraw } from './ui.js';

function loadMapAPI() {
    window._AMapSecurityConfig = {
        securityJsCode: SECURITY_JS_CODE
    };

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${API_KEY}&plugin=AMap.ArrivalRange,AMap.GeometryUtil`;
    script.onload = init;
    document.head.appendChild(script);
}

function init() {
    initializeMap('container');
    setupUIEventListeners();
    setActiveInput('lnglat1'); // Set initial active input
    initialDraw();
}

// Start the application
loadMapAPI();