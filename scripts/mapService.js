import { state } from './state.js';
import { MAP_CONFIG, MARKER_ICONS, POLYGON_STYLES } from './config.js';

export function initializeMap(containerId) {
    state.map = new AMap.Map(containerId, {
        zoomEnable: true,
        ...MAP_CONFIG
    });
    return state.map;
}

export function addOrMoveMarker(position, markerNum) {
    if (Array.isArray(position)) {
        position = new AMap.LngLat(parseFloat(position[0]), parseFloat(position[1]));
    }
    const isMarker1 = markerNum === 1;
    const markerKey = isMarker1 ? 'marker1' : 'marker2';
    let marker = state.markers[markerKey];
    const iconConfig = isMarker1 ? MARKER_ICONS.start1 : MARKER_ICONS.start2;

    // Create icon element
    const iconElement = document.createElement('i');
    iconElement.className = `fas ${iconConfig.iconClass}`;
    iconElement.style.color = iconConfig.color;
    iconElement.style.fontSize = '30px';

    if (!marker) {
        marker = new AMap.Marker({
            map: state.map,
            position: position,
            content: iconElement.outerHTML,
            offset: new AMap.Pixel(-15, -30) // Adjust offset for the new icon
        });
        state.markers[markerKey] = marker;
    } else {
        marker.setPosition(position);
        marker.setContent(iconElement.outerHTML); // Update content if marker exists
    }
}

function clearPolygons(polygonKey) {
    state.map.remove(state.polygons[polygonKey]);
    state.polygons[polygonKey] = [];
}

export function searchArrivalRange(lnglat, time, vehicle, polygonKey, arrivalRangeKey) {
    if (!state.arrivalRange[arrivalRangeKey]) {
        state.arrivalRange[arrivalRangeKey] = new AMap.ArrivalRange();
    }

    clearPolygons(polygonKey);
    const style = polygonKey === 'polygons1' ? POLYGON_STYLES.polygon1 : POLYGON_STYLES.polygon2;

    state.arrivalRange[arrivalRangeKey].search(lnglat, time, function (status, result) {
        if (result.bounds) {
            for (let i = 0; i < result.bounds.length; i++) {
                const polygon = new AMap.Polygon({ ...style });
                polygon.setPath(result.bounds[i]);
                state.polygons[polygonKey].push(polygon);
            }
        }
        // This callback is async, we need to calculate intersection after both searches are done
        if (state.polygons.polygons1.length > 0 && state.polygons.polygons2.length > 0) {
            calculateAndDrawIntersection();
        }
    }, { policy: vehicle });
}

export function calculateAndDrawIntersection() {
    clearPolygons('intersectionPolygons');

    for (const p1 of state.polygons.polygons1) {
        for (const p2 of state.polygons.polygons2) {
            const path1 = p1.getPath();
            const path2 = p2.getPath();
            const intersection = AMap.GeometryUtil.ringRingClip(path1, path2);

            if (intersection && intersection.length > 0) {
                const intersectionPolygon = new AMap.Polygon({ ...POLYGON_STYLES.intersection });
                intersectionPolygon.setPath(intersection);
                state.polygons.intersectionPolygons.push(intersectionPolygon);
            }
        }
    }

    if (state.polygons.intersectionPolygons.length > 0) {
        state.map.add(state.polygons.intersectionPolygons);
        state.map.setFitView();
    }
}

export function clearAllLayers() {
    clearPolygons('polygons1');
    clearPolygons('polygons2');
    clearPolygons('intersectionPolygons');
}