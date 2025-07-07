import {
    state
} from './state.js';
import {
    MAP_CONFIG,
    INTERSECTION_POLYGON_STYLE
} from './config.js';
import {
    updateLocationFromMapClick
} from './ui.js';


export function initializeMap(containerId) {
    state.map = new AMap.Map(containerId, {
        zoomEnable: true,
        ...MAP_CONFIG
    });
    state.map.on('click', (e) => {
        if (state.activeInputId) {
            updateLocationFromMapClick(e.lnglat);
            state.map.setStatus('clickable'); // Ensure map remains clickable
        }
    });
    return state.map;
}

export function addOrMoveMarker(position, location) {
    if (Array.isArray(position)) {
        position = new AMap.LngLat(parseFloat(position[0]), parseFloat(position[1]));
    }

    const iconElement = document.createElement('i');
    iconElement.className = 'fas fa-map-marker-alt';
    iconElement.style.color = location.color;
    iconElement.style.fontSize = '30px';

    if (!location.marker) {
        location.marker = new AMap.Marker({
            map: state.map,
            position: position,
            content: iconElement.outerHTML,
            offset: new AMap.Pixel(-15, -30),
            extData: location
        });
    } else {
        location.marker.setPosition(position);
        location.marker.setContent(iconElement.outerHTML);
        location.marker.setExtData(location);
    }
}

// Reimplementing based on the original successful pattern
export function searchArrivalRange(location, vehicle, callback) {
    // Create a new instance for each search to avoid conflicts
    const arrivalRange = new AMap.ArrivalRange();

    location.polygons = []; // Clear previous results

    arrivalRange.search(location.lnglat, location.time, (status, result) => {
        if (result && result.bounds) {
            for (let i = 0; i < result.bounds.length; i++) {
                const polygon = new AMap.Polygon({
                    // Temporary style, will not be displayed
                    fillOpacity: 0,
                    strokeOpacity: 0,
                });
                polygon.setPath(result.bounds[i]);
                location.polygons.push(polygon);
            }
        }
        // Use callback to signal completion, mimicking the original async handling
        callback();
    }, {
        policy: vehicle
    });
}


export function calculateAndDrawIntersection() {
    clearIntersection();

    const locationsWithPolygons = state.locations.filter(loc => loc.polygons && loc.polygons.length > 0);
    if (locationsWithPolygons.length < 1) {
        return;
    }

    let currentIntersectionPolygons = locationsWithPolygons[0].polygons;

    // Iteratively calculate the intersection.
    for (let i = 1; i < locationsWithPolygons.length; i++) {
        const nextLocationPolygons = locationsWithPolygons[i].polygons;
        const newIntersectionPolygons = [];

        for (const p1 of currentIntersectionPolygons) {
            for (const p2 of nextLocationPolygons) {
                const path1 = p1.getPath();
                const path2 = p2.getPath();
                // Use AMap's own geometry utility.
                const intersection = AMap.GeometryUtil.ringRingClip(path1, path2);

                if (intersection && intersection.length > 0) {
                    const intersectionPolygon = new AMap.Polygon({
                        ...INTERSECTION_POLYGON_STYLE,
                        path: intersection // Let AMap handle the result directly
                    });
                    newIntersectionPolygons.push(intersectionPolygon);
                }
            }
        }
        currentIntersectionPolygons = newIntersectionPolygons;
        // If at any point the intersection is empty, no need to continue.
        if (currentIntersectionPolygons.length === 0) break;
    }


    if (currentIntersectionPolygons.length > 0) {
        state.intersectionPolygons = currentIntersectionPolygons;
        state.map.add(state.intersectionPolygons);
        state.map.setFitView(state.intersectionPolygons);
    }
}


function clearIntersection() {
    if (state.intersectionPolygons.length > 0) {
        state.map.remove(state.intersectionPolygons);
        state.intersectionPolygons = [];
    }
}

export function clearAllLayers() {
    clearIntersection();
    state.locations.forEach(loc => loc.polygons = []);
}