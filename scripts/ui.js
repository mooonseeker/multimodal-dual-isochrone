import { state } from './state.js';
import { addOrMoveMarker, searchArrivalRange, calculateAndDrawIntersection, clearAllLayers } from './mapService.js';

let searchTimeout;

export function setActiveInput(inputId) {
    state.activeInputId = inputId;
    const activeStyle = { 'border': '1px solid #ff8800' };
    const defaultStyle = { 'border': '' };
    $('#lnglat1').css(state.activeInputId === 'lnglat1' ? activeStyle : defaultStyle);
    $('#lnglat2').css(state.activeInputId === 'lnglat2' ? activeStyle : defaultStyle);
}

function getInputs() {
    return {
        lnglat1: $("#lnglat1").val().split(','),
        t1: $("#t1").val(),
        lnglat2: $("#lnglat2").val().split(','),
        t2: $("#t2").val(),
        v: $("#v").val()
    };
}

function performSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const { lnglat1, t1, lnglat2, t2, v } = getInputs();
        // Clear previous polygons before new searches
        clearAllLayers();
        searchArrivalRange(lnglat1, t1, v, 'polygons1', 'arrivalRange1');
        searchArrivalRange(lnglat2, t2, v, 'polygons2', 'arrivalRange2');
    }, 500); // Debounce to avoid rapid firing
}

export function setupUIEventListeners() {
    state.map.on('click', function (e) {
        const position = e.lnglat;
        $('#' + state.activeInputId).val(position.getLng() + ',' + position.getLat());
        addOrMoveMarker(position, state.activeInputId === 'lnglat1' ? 1 : 2);
    });

    $('#select1, #lnglat1').on('click focus', () => setActiveInput('lnglat1'));
    $('#select2, #lnglat2').on('click focus', () => setActiveInput('lnglat2'));

    $('#search').on('click', performSearch);
    $('#v').on('change', performSearch);
    $('#clear').on('click', clearAllLayers);

    $('.single-slider').jRange({
        onstatechange: performSearch,
        from: 1,
        to: 45,
        step: 1,
        scale: [1, 15, 30, 45],
        format: '%s',
        width: 400,
        showLabels: true,
        showScale: true
    });
}

export function initialDraw() {
    // Initial marker positions
    addOrMoveMarker($("#lnglat1").val().split(','), 1);
    addOrMoveMarker($("#lnglat2").val().split(','), 2);
    performSearch(); // Initial search
}