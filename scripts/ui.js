import {
    state,
    initializeLocations
} from './state.js';
import {
    addOrMoveMarker,
    searchArrivalRange,
    clearAllLayers,
    calculateAndDrawIntersection
} from './mapService.js';
import {
    MAX_LOCATIONS,
    LOCATION_COLORS
} from './config.js';

function getVehicleType() {
    return document.getElementById('v').value;
}

export function initialDraw() {
    state.locations.forEach(location => {
        addOrMoveMarker(location.lnglat, location);
    });
    startSearch();
}

export function setupUIEventListeners() {
    document.getElementById('add-location').addEventListener('click', addLocation);
    document.getElementById('clear').addEventListener('click', clearAllLayers);
    document.getElementById('manual-query-switch').addEventListener('change', toggleQueryMode);

    const locationsContainer = document.getElementById('locations-container');
    locationsContainer.addEventListener('click', handleLocationAction);
    locationsContainer.addEventListener('change', handleLocationInputChange);

    // Initial render
    renderLocations();
}

function handleLocationAction(event) {
    const target = event.target;
    const locationId = target.closest('.location-group')?.dataset.id;
    if (!locationId) return;

    const location = state.locations.find(loc => loc.id === locationId);
    if (!location) return;

    if (target.classList.contains('select-point')) {
        state.activeInputId = location.id;
        renderLocations(); // 重新渲染以显示高亮
    } else if (target.classList.contains('remove-location')) {
        removeLocation(location.id);
    }
}

function handleLocationInputChange(event) {
    const target = event.target;
    const locationId = target.closest('.location-group')?.dataset.id;
    if (!locationId) return;

    const location = state.locations.find(loc => loc.id === locationId);
    if (!location) return;

    if (target.classList.contains('lnglat-input')) {
        const lnglat = target.value.split(',').map(Number);
        if (lnglat.length === 2 && !isNaN(lnglat[0]) && !isNaN(lnglat[1])) {
            location.lnglat = lnglat;
            addOrMoveMarker(location.lnglat, location);
            if (state.appMode === 'instant') {
                startSearch();
            }
        }
    }
}

function renderLocations() {
    const container = document.getElementById('locations-container');
    container.innerHTML = ''; // Clear previous content

    state.locations.forEach((location, index) => {
        const locationEl = document.createElement('div');
        locationEl.className = 'location-group';
        locationEl.dataset.id = location.id;
        locationEl.style.borderLeft = `5px solid ${location.color}`;
        // 高亮当前选中的地点
        if (location.id === state.activeInputId) {
            locationEl.style.boxShadow = '0 0 10px rgba(255,127,0,0.7)';
            locationEl.style.borderLeft = `5px solid #FF7F00`;
        }

        const label = `出发位置 ${index + 1}`;
        locationEl.innerHTML = `
                <div class="location-header">
                    <span class="location-label">${label}</span>
                    <button class="btn remove-location"><i class="fas fa-trash-alt"></i></button>
                </div>
                <div class="location-body">
                    <div class="location-row">
                        <input type="text" class="lnglat-input" value="${location.lnglat.join(',')}">
                        <input type="button" class="btn select-point" value="选点">
                    </div>
                    <div class="location-row time-slider-container">
                        <label>时长: <span class="time-value">${location.time}</span> min</label>
                        <input type="hidden" class="single-slider" value="${location.time}">
                    </div>
                </div>
        `;
        container.appendChild(locationEl);
    });

    // Initialize new sliders
    $('.single-slider').each(function (index) {
        const location = state.locations[index];
        $(this).jRange({
            from: 0,
            to: 60,
            step: 1,
            scale: [0, 15, 30, 45, 60],
            format: '%s min',
            width: '100%',
            showLabels: true,
            isRange: false,
            onstatechange: (value) => {
                location.time = value;
                // Update the time display
                $(this).closest('.time-slider-container').find('.time-value').text(value);
                if (state.appMode === 'instant') {
                    startSearch();
                }
            }
        });
    });

    // Update button states
    document.getElementById('add-location').disabled = state.locations.length >= MAX_LOCATIONS;
    document.querySelectorAll('.remove-location').forEach(btn => {
        btn.disabled = state.locations.length <= 1;
    });
}

function addLocation() {
    if (state.locations.length < MAX_LOCATIONS) {
        const newLocation = {
            id: `loc-${Date.now()}`,
            lnglat: state.map.getCenter().toArray(),
            time: 30,
            marker: null,
            polygons: [],
            color: LOCATION_COLORS[state.locations.length % LOCATION_COLORS.length]
        };
        state.locations.push(newLocation);
        renderLocations();
        addOrMoveMarker(newLocation.lnglat, newLocation);
    }
}

function removeLocation(id) {
    if (state.locations.length > 1) {
        const locationIndex = state.locations.findIndex(loc => loc.id === id);
        if (locationIndex > -1) {
            const [removedLocation] = state.locations.splice(locationIndex, 1);
            if (removedLocation.marker) {
                state.map.remove(removedLocation.marker);
            }
            renderLocations();
            if (state.appMode === 'instant') {
                startSearch();
            }
        }
    }
}

function toggleQueryMode(event) {
    state.appMode = event.target.checked ? 'manual' : 'instant';
    document.getElementById('search').style.display = event.target.checked ? 'inline-block' : 'none';

    if (state.appMode === 'manual') {
        // Unbind the search button if it exists, and re-bind it.
        const searchButton = document.getElementById('search');
        const newSearchButton = searchButton.cloneNode(true);
        searchButton.parentNode.replaceChild(newSearchButton, searchButton);
        newSearchButton.addEventListener('click', startSearch);
    }
}


export function updateLocationFromMapClick(lngLat) {
    if (state.activeInputId) {
        const location = state.locations.find(loc => loc.id === state.activeInputId);
        if (location) {
            location.lnglat = [lngLat.lng, lngLat.lat];
            addOrMoveMarker(location.lnglat, location);
            renderLocations(); // Re-render to update the input value
            if (state.appMode === 'instant') {
                startSearch();
            }
            state.activeInputId = null; // Reset after selection
        }
    }
}

function startSearch() {
    clearAllLayers();
    // 清除选点聚焦状态
    state.activeInputId = null;
    renderLocations();

    const vehicle = getVehicleType();
    const locationsToSearch = state.locations;
    let completedSearches = 0;

    // Use a counter to track completion of async callbacks
    const onSearchComplete = () => {
        completedSearches++;
        if (completedSearches === locationsToSearch.length) {
            calculateAndDrawIntersection();
        }
    };

    locationsToSearch.forEach(location => {
        searchArrivalRange(location, vehicle, onSearchComplete);
    });
}