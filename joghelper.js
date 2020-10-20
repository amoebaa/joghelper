/*
	<script src="https://unpkg.com/leaflet@1.0.3/dist/leaflet.js"></script>
	<script src="https://code.jquery.com/jquery-3.2.1.min.js"></script>
	<script src="https://unpkg.com/osmtogeojson@2.2.12/osmtogeojson.js"></script>
*/

// ToDo: create const values, also read from cookies
var map = L.map('map').setView([61.5, 23.85], 14);
L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', 
{
	maxZoom: 18,
	attribution: 'Map data &copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap</a> contributors</a>'
}).addTo(map);

function generalOverpassApiUrl(map, overpassQuery) 
 {
	var bounds = map.getBounds().getSouth() + ',' + map.getBounds().getWest() + ',' + map.getBounds().getNorth() + ',' + map.getBounds().getEast();
	var nodeQuery = 'node[' + overpassQuery + '](' + bounds + ');';
	var wayQuery = 'way[' + overpassQuery + '](' + bounds + ');';
	var relationQuery = 'relation[' + overpassQuery + '](' + bounds + ');';
	var query = '?data=[out:json][timeout:15];(' + nodeQuery + wayQuery + relationQuery + ');out body geom;';
	var baseUrl = 'http://overpass-api.de/api/interpreter';
	var resultUrl = baseUrl + query;
	return resultUrl;
}

$("#general_query-button").click(function () {
	var queryTextfieldValue = $("#general_query-textfield").val();
	var overpassApiUrl = generalOverpassApiUrl(map, queryTextfieldValue);
	
	$.get(overpassApiUrl, function (osmDataAsJson) {
	  var resultAsGeojson = osmtogeojson(osmDataAsJson);
	  var resultLayer = L.geoJson(resultAsGeojson, {
	    style: function (feature) {
	      return {color: "#ff00ff"};
	    },
	    filter: function (feature, layer) {
	      var isPolygon = (feature.geometry) && (feature.geometry.type !== undefined) && (feature.geometry.type === "Polygon");
	      if (isPolygon) {
	        feature.geometry.type = "Point";
	        var polygonCenter = L.latLngBounds(feature.geometry.coordinates[0]).getCenter();
	        feature.geometry.coordinates = [ polygonCenter.lat, polygonCenter.lng ];
	      }
	      return true;
	    },
	    onEachFeature: function (feature, layer) {
	      var popupContent = "";
	      popupContent = popupContent + "<dt>@id</dt><dd>" + feature.properties.type + "/" + feature.properties.id + "</dd>";
	      var keys = Object.keys(feature.properties.tags);
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
function specificOverpassApiUrl(map, queryVal) 
{
	var bounds = map.getBounds().getSouth() + ',' + map.getBounds().getWest() + ',' + map.getBounds().getNorth() + ',' + map.getBounds().getEast();
	// ToDo: const values
	var query = '?data=[out:json][timeout:15];(' + queryVal + '(' + bounds + ');' + ');out body geom;';
	var baseUrl = 'http://overpass-api.de/api/interpreter';
	var resultUrl = baseUrl + query;
	return resultUrl;
}

$("#soft_roads-button").click(function () 
{
	/*  Orig:
	var queryValue = 'surface~"^(wood|unpaved|compacted|fine_gravel|gravel|pebblestone|dirt|earth|ground|woodchips)$"';
	var overpassApiUrl = specificOverpassApiUrl(map, 'way[' + queryValue + ']');
	*/
	var known_good = '[surface~"^(wood|unpaved|compacted|fine_gravel|gravel|pebblestone|dirt|earth|ground|woodchips)$"]';
	var known_good_OPApiUrl = specificOverpassApiUrl(map, 'way' + known_good);

	var maybe_ok = '[highway~"^(footway|path|cycleway|track)$"][surface!=paved]';
	var maybe_ok_OPApiUrl = specificOverpassApiUrl(map, 'way' + maybe_ok);

	// $.get(overpassApiUrl, function (osmDataAsJson) 
	$.get(known_good_OPApiUrl, function (osmDataAsJson) 
	// $.get(maybe_ok_OPApiUrl, function (osmDataAsJson) 
	{
		var resultAsGeojson = osmtogeojson(osmDataAsJson);
		var resultLayer = L.geoJson(resultAsGeojson, 
		{
			style: function (feature) 
				{ return {color: "rgba(95,31,191,0.75)"}; },
				// { return {color: "rgba(0,127,191,0.75)"}; },
			onEachFeature: function (feature, layer) 
			{
				var popupContent = "";
				popupContent = popupContent + "<dt>@id</dt><dd>" + feature.properties.type + "/" + feature.properties.id + "</dd>";
				var keys = Object.keys(feature.properties.tags);
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
