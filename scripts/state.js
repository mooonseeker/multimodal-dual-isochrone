import {
    INITIAL_LOCATIONS,
    LOCATION_COLORS
} from './config.js';

export const state = {
    map: null,
    activeInputId: null, // Will be determined by UI interaction
    locations: [],
    intersectionPolygons: [],
    appMode: 'instant', // 'instant' or 'manual'
};

// Initialize locations
export function initializeLocations() {
    state.locations = INITIAL_LOCATIONS.map((loc, index) => ({
        id: `loc-${Date.now()}-${index}`,
        lnglat: loc.lnglat.split(',').map(Number),
        time: loc.time,
        marker: null,
        polygons: [],
        color: LOCATION_COLORS[index]
    }));
}