const default_overpass_url = 'https://overpass-api.de/api/interpreter';
// Overpass query stuff:
const default_opq_settings = 'data=[out:json][timeout:15]';
const default_opq_statements = 'out body geom';

const default_start_lat = 61.5;
const default_start_lon = 23.85;
const default_start_zoom = 14;
const good_surfaces = '[surface~"^(wood|unpaved|compacted|fine_gravel|gravel|pebblestone|dirt|earth|ground|woodchips)$"]';
const maybe_paths = '[highway~"^(footway|path|cycleway|track)$"][surface!=paved]';
const default_color_good = "rgba(127,63,191,0.5)";
const default_query = 'leisure=fitness_station';

var jogmap = L.map('map');

// Loading and saving local data
function load_local_data() {
	const start_data = new Map();
	const start_lati = localStorage.getItem('latitude') || default_start_lat;
	start_data.set('start_lat', start_lati);
	const start_long = localStorage.getItem('longitude') || default_start_lon;
	start_data.set('start_lon', start_long);
	const start_zooms = localStorage.getItem('zoom_level') || default_start_zoom;
	start_data.set('start_zoom', start_zooms);

	const start_query = localStorage.getItem('query_string');
	start_query ? $("#general_query-textfield").val(start_query) : 
		$("#general_query-textfield").val(default_query);
	// console.log("DEBUG, in load_local_data, start_data is: ", start_data);
	return start_data;
}

function set_map(start_data) {
	jogmap.setView([start_data.get('start_lat'), start_data.get('start_lon')], start_data.get('start_zoom'));
	L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', 
	{
		maxZoom: 18,
		attribution: 'Map data &copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors</a>'
	}).addTo(jogmap);
	// console.log("DEBUG: have tried to initialize jogmap: ", jogmap);
}

function save_local_data() {
	const query_textfield_value = $("#general_query-textfield").val();
	const center = jogmap.getCenter();
	const zoom = jogmap.getZoom();
	localStorage.setItem('query_string', query_textfield_value);
	localStorage.setItem('latitude', center.lat);
	localStorage.setItem('longitude', center.lng);
	localStorage.setItem('zoom_level', zoom);
}

$(window).on("load", function() { 
	start_data = load_local_data();
	set_map(start_data);
})

$(window).on("beforeunload", function() { 
	save_local_data();
})

$("#overpass-api-controls").mouseover(function (event) {
	jogmap.dragging.disable();
});

$("#overpass-api-controls").mouseout(function (event) {
	jogmap.dragging.enable();
});

// Query for feature from text field
function generalOverpass_api_url(map, overpass_query) 
{
	let bounds = map.getBounds().getSouth() + ',' + map.getBounds().getWest() + ',' + map.getBounds().getNorth() + ',' + map.getBounds().getEast();
	let node_query = 'node[' + overpass_query + '](' + bounds + ');';
	let way_query = 'way[' + overpass_query + '](' + bounds + ');';
	let relation_query = 'relation[' + overpass_query + '](' + bounds + ');';
	let query = '?' + default_opq_settings + ';(' + node_query + way_query + relation_query + ');' + default_opq_statements + ';';
	return default_overpass_url + query;
}

$("#general_query-button").click(function () {
	let queryTextfieldValue = $("#general_query-textfield").val();
	let overpass_api_url = generalOverpass_api_url(jogmap, queryTextfieldValue);
	
	$.get(overpass_api_url, function (osmDataAsJson) {
	  let resultAsGeojson = osmtogeojson(osmDataAsJson);
	  let resultLayer = L.geoJson(resultAsGeojson, {
	    style: function (feature) {
	      return {color: "#ff00ff"};
	    },
	    filter: function (feature, layer) {
	      let isPolygon = (feature.geometry) && (feature.geometry.type !== undefined) && (feature.geometry.type === "Polygon");
	      if (isPolygon) {
	        feature.geometry.type = "Point";
	        let polygonCenter = L.latLngBounds(feature.geometry.coordinates[0]).getCenter();
	        feature.geometry.coordinates = [ polygonCenter.lat, polygonCenter.lng ];
	      }
	      return true;
	    },
	    onEachFeature: function (feature, layer) {
	      let popupContent = "";
	      popupContent = popupContent + "<dt>@id</dt><dd>" + feature.properties.type + "/" + feature.properties.id + "</dd>";
	      let keys = Object.keys(feature.properties.tags);
	      keys.forEach(function (key) {
	        popupContent = popupContent + "<dt>" + key + "</dt><dd>" + feature.properties.tags[key] + "</dd>";
	      });
	      popupContent = popupContent + "</dl>"
	      layer.bindPopup(popupContent);
	    }
	  }).addTo(jogmap);
	});
});


// Soft roads query
function specific_overpass_api_url(map, queryVal) 
{
	let bounds = map.getBounds().getSouth() + ',' + map.getBounds().getWest() + ',' + map.getBounds().getNorth() + ',' + map.getBounds().getEast();
	let query = '?' + default_opq_settings + ';(' + queryVal + '(' + bounds + ');' + ');' + default_opq_statements + ';';
	return default_overpass_url + query;
}

$("#soft_roads-button").click(function () 
{
	/*  Orig:
	var queryValue = 'surface~"^(wood|unpaved|compacted|fine_gravel|gravel|pebblestone|dirt|earth|ground|woodchips)$"';
	var overpassApiUrl = specificOverpassApiUrl(map, 'way[' + queryValue + ']');
	*/
	let known_good = good_surfaces;
	let known_good_OP_api_url = specific_overpass_api_url(jogmap, 'way' + known_good);

	let maybe_ok = maybe_paths;
	let maybe_ok_OP_api_url = specific_overpass_api_url(jogmap, 'way' + maybe_ok);

	// $.get(overpassApiUrl, function (osmDataAsJson) 
	$.get(known_good_OP_api_url, function (osmDataAsJson) 
	// $.get(maybe_ok_OPApiUrl, function (osmDataAsJson) 
	{
		let resultAsGeojson = osmtogeojson(osmDataAsJson);
		let resultLayer = L.geoJson(resultAsGeojson, 
		{
			style: function (feature) 
				{ return {color: default_color_good}; },
				// { return {color: "rgba(0,127,191,0.75)"}; },
			onEachFeature: function (feature, layer) 
			{
				let popupContent = "";
				popupContent = popupContent + "<dt>@id</dt><dd>" + feature.properties.type + "/" + feature.properties.id + "</dd>";
				let keys = Object.keys(feature.properties.tags);
				keys.forEach(function (key) 
				{
					popupContent = popupContent + "<dt>" + key + "</dt><dd>" + feature.properties.tags[key] + "</dd>";
				});
				popupContent = popupContent + "</dl>"
				layer.bindPopup(popupContent);
			}
		}).addTo(jogmap);
	});
});
