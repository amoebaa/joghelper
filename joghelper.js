/*
	<script src="https://unpkg.com/leaflet@1.0.3/dist/leaflet.js"></script>
	<script src="https://code.jquery.com/jquery-3.2.1.min.js"></script>
	<script src="https://unpkg.com/osmtogeojson@2.2.12/osmtogeojson.js"></script>
*/

// ToDo: create const values, also read from cookies
const default_start_lat = 61.5;
const default_start_lon = 23.85;
const default_start_zoom = 14;
const good_surfaces = '[surface~"^(wood|unpaved|compacted|fine_gravel|gravel|pebblestone|dirt|earth|ground|woodchips)$"]';
const maybe_paths = '[highway~"^(footway|path|cycleway|track)$"][surface!=paved]';
const default_color_good = "rgba(127,63,191,0.5)";

// var map = L.map('map').setView([61.5, 23.85], 14);
var map = L.map('map').setView([default_start_lat, default_start_lon], default_start_zoom);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', 
{
	maxZoom: 18,
	attribution: 'Map data &copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors</a>'
}).addTo(map);

function generalOverpass_api_url(map, overpass_query) 
{
	let bounds = map.getBounds().getSouth() + ',' + map.getBounds().getWest() + ',' + map.getBounds().getNorth() + ',' + map.getBounds().getEast();
	let node_query = 'node[' + overpass_query + '](' + bounds + ');';
	let way_query = 'way[' + overpass_query + '](' + bounds + ');';
	let relation_query = 'relation[' + overpass_query + '](' + bounds + ');';
	let query = '?data=[out:json][timeout:15];(' + node_query + way_query + relation_query + ');out body geom;';
	let base_url = 'https://overpass-api.de/api/interpreter';
	let result_url = base_url + query;
	return result_url;
}

$("#general_query-button").click(function () {
	let queryTextfieldValue = $("#general_query-textfield").val();
	let overpass_api_url = generalOverpass_api_url(map, queryTextfieldValue);
	
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
	  }).addTo(map);
	});
});


// node or way query
function specific_overpass_api_url(map, queryVal) 
{
	let bounds = map.getBounds().getSouth() + ',' + map.getBounds().getWest() + ',' + map.getBounds().getNorth() + ',' + map.getBounds().getEast();
	// ToDo: const values
	let query = '?data=[out:json][timeout:15];(' + queryVal + '(' + bounds + ');' + ');out body geom;';
	let baseUrl = 'https://overpass-api.de/api/interpreter';
	let resultUrl = baseUrl + query;
	return resultUrl;
}

$("#soft_roads-button").click(function () 
{
	/*  Orig:
	var queryValue = 'surface~"^(wood|unpaved|compacted|fine_gravel|gravel|pebblestone|dirt|earth|ground|woodchips)$"';
	var overpassApiUrl = specificOverpassApiUrl(map, 'way[' + queryValue + ']');
	*/
	let known_good = good_surfaces;
	let known_good_OP_api_url = specific_overpass_api_url(map, 'way' + known_good);

	let maybe_ok = maybe_paths;
	let maybe_ok_OP_api_url = specific_overpass_api_url(map, 'way' + maybe_ok);

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
		}).addTo(map);
	});
});
