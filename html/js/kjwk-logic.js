/*
This file contains all the "real" javascript code; the others are mainly
data structures generated by other tools.
*/

// todo consider shinjitai and kyuujitai
// todo export graph shown to text
// todo show radical info if focused is radical
// todo include parents of all forms of radical 糸
// todo find most interesting longest/biggest top 10 and recommend them in looked up
// todo find any duplicate kanji in trees

// Make Enter key submit a kanji lookup
// Make left/right arrow support sequential browsing
var browsedKanjiIndex = 0;
var browseKeys = Object.keys(kanji_parts).sort();

$(document).ready(function() {
	$('#lookup_kanji').keydown(function(event) {
		if (event.keyCode == 13) {
			lookup();
			return false;
		}
	});
	$('html').keydown(function(event) {
	// Right arrow
	if (event.keyCode == 37) {
		browsedKanjiIndex--;
		if (browsedKanjiIndex < 0) {
			browsedKanjiIndex = browseKeys.length - 1;
		}
		lookupOne(browseKeys[browsedKanjiIndex]);
		return false;
	}
	// Left arrow
	if (event.keyCode == 39) {
		browsedKanjiIndex++;
		if (browsedKanjiIndex > browseKeys.length - 1) {
			browsedKanjiIndex = 0;
		}
		lookupOne(browseKeys[browsedKanjiIndex]);
		return false;
	}
});
});

// Globals for recursive function
var nodes = [];
var edges = [];
var globalId = 0; // unique ID for each node of graph

// Colors -- manually match to CSS for now
var COLOR_MAIN = '#ACEDED';
var COLOR_PARTOF = '#C5B7F1';
var COLOR_RADICAL = '#B3F6B3';
var COLOR_SHARED_ONYOMI = '#FFD9BA';
var COLOR_NO_DICT = '#FFBABA';
var COLOR_IJIDOUKUN = '#FFE270';
var COLOR_ERROR = '#FFD9BA';

// Ensure each kanji node gets a new ID
// It's really 1-based; a zero ID means none have been assigned
function getNewNodeId() {
	globalId++;
	return globalId;
}

// Others
var container = document.getElementById('visgraph');
var mostRecentlyUsed = {};

// Keep track of history state.
// If we are responding to a popstate, then do not push.
var poppedState = false;

/*
	Remember each kanji's reason for being displayed.
	Do this for each node you add to the graph.
*/
var relations = {};  // Remember
function addRelation(kanji, reason) {
	if (!relations[kanji]) {
		relations[kanji] = { 'reason': reason };
	}
}
function isRelation(kanji) {
	return relations[kanji] ? true : false;
}
function clearRelations() {
	relations = {};
}

// Build graph based on selected, but downstream only.
// We assume there are no cycles in the graph and do not check.
// addParentNodes() for upstream logic is different
// 'main' is the large kanji at the center of the graph
// 'focused' is the kanji we are handling now (1st arg)
function buildDescendantsGraph(kanji, parentId) {
	var myId = getNewNodeId();
	// Make main kanji slightly larger
	var fontSize = parentId == 0 ? 60 : 40;
	// Thicker border for jouyou
	var borderThickness = is_jouyou(kanji) ? 4 : 1;

	// Radical ID == 0 means this kanji is not a radical
	var radical_id = 0;

	// Use different color code for matching on readings
	// (implies that might be the purpose of this related kanji)
	var color = COLOR_MAIN;
	// Main kanji ID is 1
	// If this is not the main one, check for:
	// * shared onyomi with main
	// * is radical of main (in any form)
	if (myId > 1) {
		var mainKanji = nodes[0].label;
		if (onReadingsInCommon(kanji, mainKanji).length) {
			color = COLOR_SHARED_ONYOMI;
		}
		// Mark focused kanji if it matches any form of the main kanji's radical
		if (mainKanji in kanji_defs) {
			// In kanji_defs, the radical is an index, not a character
			var kangxi_id = kanji_defs[mainKanji].radical;
			var candidates = radical_list[kangxi_id].rad;
			if (candidates.indexOf(kanji) >= 0) {
				color = COLOR_RADICAL;
				radical_id = kangxi_id;  // Save for drawOtherFormsOfRadical()
			}
		}
	}

	var nodeProperties = {
		'id': myId,
		'font': { size: fontSize },
		'color': color,
		'label': kanji,
		'borderWidth': borderThickness
	};
	// Unknown kanji: dashed border
	if (!(kanji in kanji_defs)) {
		nodeProperties.shapeProperties = {borderDashes:[5,5]};
		nodeProperties.color = COLOR_NO_DICT;
	}
	nodes.push(nodeProperties);
	if (parentId > 0) {
		edges.push({from: parentId, to: myId, arrows:'to', length:200});
	}

	// Record reason for adding this node
	var reason = '---';
	if (myId == 1) {
		reason = '(主眼 - main kanji)';
	}
	else if (radical_id > 0) {
		reason = '部首 - radical';
	}
	else {
		reason = '部分 - part';
	}
	addRelation(kanji, reason);

	// If this kanji is a radical of main (parentId == 1),
	// Add other forms but do not expand them
	if (parentId == 1 && radical_id > 0) {
		drawOtherFormsOfRadical(kanji, myId, radical_id);
	}

	// Here's the recursion
	if (kanji_parts[kanji]) {
		for (var subnode of kanji_parts[kanji]) {
			buildDescendantsGraph(subnode, myId);
		}
	}
}

// Add other forms of the radical (if any) to the graph, but do not expand them
function drawOtherFormsOfRadical(kanji, myId, radical_id) {
	var fontSize = 40;  // We are never the main kanji
	var color = COLOR_RADICAL;
	if (radical_id > 0) {
		var candidates = radical_list[radical_id].rad;
		for (var candidate of candidates) {
			if (candidate != kanji) {
				var isoform_id = getNewNodeId();
				var borderThickness = is_jouyou(candidate) ? 4 : 1;
				var np = {
					'id': isoform_id,
					'font': { size: fontSize },
					'color': color,
					'label': candidate,
					'borderWidth': borderThickness
				};
				nodes.push(np);
				edges.push({from: isoform_id, to: myId,
							length:200, dashes: true,
							label: '異字部首 (variant radicals)', font: {align: 'horizontal'}});
				addRelation(candidate, '異字部首 - other form of radical');
			}
		}
	}
}

// Find all parents of this kanji, but 1 level only
// We know ID is 1
function addParentNodes(kanji) {
	for (var parent of Object.keys(kanji_parts)) {
		if (kanji_parts[parent].includes(kanji)) {
			var parentId = getNewNodeId();
			var borderThickness = is_jouyou(parent) ? 4 : 1;
			var color = COLOR_PARTOF;
			if (parentId > 1) {  // buggy; see 享
				if (onReadingsInCommon(parent, nodes[0].label).length) {
					color = COLOR_SHARED_ONYOMI;
				}
			}
			var np = {
				'id': parentId,
				'font': { size: 40 },
				'color': color,
				'label': parent,
				'borderWidth': borderThickness
			};
			nodes.push(np);
			edges.push({from: parentId, to: 1, arrows:'to', length:200});
			addRelation(parent, "contains main");
		}
	}
}

// Find kanji with same kunyomi and meaning as main
// Omit kanji already in graph
// We know the ID is 1; call this only for main kanji
function addIjidoukun(mainKanji) {
	var sisters = new Set();
	for (var group of ijidoukun) {
		if (group.kanji.includes(mainKanji)) {
			var exceptMain = group.kanji.filter(function(x) { return x !== mainKanji; });
			// Skip kanji that are already on graph for other reasons
			for (var sister of exceptMain) {
				if (!isRelation(sister)) {
					sisters.add(sister);
				}
			}
		}
	}
	// Now we have all our sisters
	for (let sister of sisters) {
		var color = COLOR_IJIDOUKUN;
		var borderThickness = is_jouyou(sister) ? 4 : 1;
		var id = getNewNodeId();
		var np = {
			'id': id,
			'font': { size: 40 },
			'color': color,
			'label': sister,
			'borderWidth': borderThickness
		};
		nodes.push(np);
		edges.push({from: 1, to: id, length:200, dashes: true,
					label: '同訓 (shared kun and meaning)', font: {align: 'horizontal'}});
		addRelation(sister, '同訓 - shared kun and meaning');
	}
}

// Find related kanji that I discovered manually
// Omit parents and children (i.e. kanji already in graph)
function addKankeiji(mainKanji) {
	var sisters = new Set();
	for (var group of kankeiji) {
		if (group.kanji.includes(mainKanji)) {
			var exceptMain = group.kanji.filter(function(x) { return x !== mainKanji; });
			for (var sister of exceptMain) {
				// Skip kanji that are already on graph for other reasons
				if (!isRelation(sister)) {
					sisters.add(sister);
					addRelation(sister, group.reason);
				}
			}
		}
	}
	// Now we have all our sisters
	for (let sister of sisters) {
		var color = COLOR_IJIDOUKUN;  // todo
		var borderThickness = is_jouyou(sister) ? 4 : 1;
		var id = getNewNodeId();
		var np = {
			'id': id,
			'font': { size: 40 },
			'color': color,
			'label': sister,
			'borderWidth': borderThickness
		};
		nodes.push(np);
		edges.push({from: 1, to: id, length:200, dashes: true,
					label: '関係 (relation)', font: {align: 'horizontal'}});
		// Relation added earlier, when we had that information
	}
}

// Find related kanji that I discovered manually
// But there's a normal to unusual/alternate form relation
function addAltForms(mainKanji) {
	var sisters = new Set();
	// main -> alt
	if (mainKanji in altforms) {
		for (var sister of Object.keys(altforms[mainKanji])) {
			if (!isRelation(sister)) {
				sisters.add(sister);
				addRelation(sister, altforms[mainKanji][sister]['reason']);
			}
		}
	}
	// alt -> main
	for (var main of Object.keys(altforms)) {
		for (var alt of Object.keys(altforms[main])) {
			if (alt == mainKanji) {
				if (!isRelation(main)) {
					sisters.add(main);
					addRelation(main, altforms[main][alt]['reason']);
				}
			}
		}
	}
	// Now we have all our sisters
	for (let sister of sisters) {
		var color = COLOR_IJIDOUKUN;  // todo
		var borderThickness = is_jouyou(sister) ? 4 : 1;
		var id = getNewNodeId();
		var np = {
			'id': id,
			'font': { size: 40 },
			'color': color,
			'label': sister,
			'borderWidth': borderThickness
		};
		nodes.push(np);
		edges.push({from: 1, to: id, length:200, dashes: true,
					label: '異字 (different characters)', font: {align: 'horizontal'}});
		// Relation added earlier, when we had that information
	}
}


// For figuring out on readings in common
function intersect(a, b) {
	var t;
	if (b.length > a.length) {
		t = b, b = a, a = t;
	} // indexOf to loop over shorter
	return a.filter(function (e) {
		return b.indexOf(e) > -1;
	});
}

function onReadingsInCommon(kanji1, kanji2) {
	if (!(kanji1 in kanji_defs) || !(kanji2 in kanji_defs)) {
		return [];
	}
	var on1 = kanji_defs[kanji1].on_readings;
	var on2 = kanji_defs[kanji2].on_readings;
	return intersect(on1, on2);
}

// Return true if the kanji is jouyou
function is_jouyou(kanji) {
	return kanji in kanji_defs && kanji_defs[kanji].is_jouyou;
}

// Update details about clicked-on kanji (which can differ from main kanji)
// Assumes graph is already built
// Difficult because some relation info is discarded when we build the graph
// Highlight shared onyomi
function update_details(kanji) {
	$('#kanji777').text(kanji);
	var mainKanji = nodes[0].label;
	if (kanji_defs[kanji]) {
		// Highlight shared onyomi, compared to parent (if not parent)
		if (kanji == mainKanji) {
			var onyomi = kanji_defs[kanji].on_readings.join(", ");
			$('#onyomi').text(onyomi);
		}
		else {
			var items = [];
			inCommon = onReadingsInCommon(kanji, mainKanji);
			for (var reading of kanji_defs[kanji].on_readings) {
				if (inCommon.indexOf(reading) > -1) {
					items.push("<span style='background: " + COLOR_SHARED_ONYOMI +
						"'>" + reading + "</span>");
				}
				else {
					items.push(reading);
				}
			}
			$('#onyomi').html(items.join(", "));
		}
		kunyomi = kanji_defs[kanji].kun_readings.join(", ");
		$('#kunyomi').text(kunyomi);
		meanings = kanji_defs[kanji].meanings.join(", ");
		$('#meanings').text(meanings);
		// Bright or dim jouyou indicator
		var jouyou_color = kanji_defs[kanji].is_jouyou ? '#444' : '#cccaca';
		// Daily used or not
		var jouyou_text = kanji_defs[kanji].is_jouyou ? 'used in everyday life' : 'not regularly use';
		$('#jouyou-yesno').css('color', jouyou_color);
		$('#isjouyou').text(jouyou_text);
		// Relation to main
		if (relations[kanji]) {
			$('#relation').text(relations[kanji]['reason']);
		}
		else {
			$('#relation').text('oops');
		}
	}
	else {
		var notFound = '---';
		$('#onyomi').text(notFound);
		$('#kunyomi').text(notFound);
		$('#isjouyou').text(notFound);
		$('#meanings').text(notFound);
		// bright or dim jouyou indicator
		$('#jouyou-yesno').css('color', '#cccaca');
		$('#relation').text(relations[kanji]['reason']);
	}
	// Even if we have no definition, still build external links to jisho.org, jitenon.com and wiktionary.org
	$('#jisho-link').attr("href", "https://jisho.org/search/" + kanji + "%20%23kanji");
	$('#wiktionary-link').attr("href", "https://en.wiktionary.org/wiki/" + kanji);

	// For jitenon, we split the encoded kanji manually, because when you used direct encodeURIComponent() it won't work
	const encodedString = encodeURIComponent(kanji);
	const splitArray = encodedString.split('%');
	const filteredArray = splitArray.filter(part => part !== '');
	$('#jitenon-link').attr("href", "https://jitenon.com/kanji/" + "%" + filteredArray[0] + "%" + filteredArray[1] + "%" + filteredArray[2]);
}

// Keep most recently used list of kanji, newest first
function update_mru(kanji) {
	// first, remove any existing
	$('#recent a').remove();
	// update with recently focused
	var unixTime = new Date().getTime();
	mostRecentlyUsed[kanji] = unixTime;
	keysSorted = Object.keys(mostRecentlyUsed).sort(
		function(a,b){
			return mostRecentlyUsed[b] - mostRecentlyUsed[a];
		}
	);
	for (var key of keysSorted) {
		$('<a>',{
			text: key,
			title: 'Look up ' + key,
			href: '#',
			style: 'padding-right: 0.5em',
			click: function(){ reset_graph(this.text); return false; }
		}).appendTo('#recent');
	}
}

// This function wil pop up, when app is no supported by browser
function show_error() {
	var error_nodes = [{
		'id': 0,
		'font': { size: 40 },
		'color': COLOR_ERROR,
		'label': "申し訳ごあじません！\nSorry, this doesn't work in this browser.\n" +
			"If you can, try one of:\nSafari (11+); Firefox or Chrome (current)",
		'shape': 'box',
	}];
	var data = {
		nodes: new vis.DataSet(error_nodes),
		edges: new vis.DataSet([])
	};
	var options = {
		nodes: { shadow:true }, edges: { shadow: true }
	};
	var network = new vis.Network(container, data, options);
}

/* 
  Update the graph for your kanji of interest (which is always ID 1)
  if the browser "can't even", now's the time to intercept that and
  show an error message
*/
function reset_graph(kanji) {
	try { 
		eval('var a=[1,2]; for (m of a) { m = m }'); 
	} 
	catch (e) {
		show_error();
		return;
	}
	nodes = [];
	edges = [];
	globalId = 0;   // was 1
	clearRelations();
	buildDescendantsGraph(kanji, 0);
	addParentNodes(kanji);
	addIjidoukun(kanji);
	addKankeiji(kanji);
	addAltForms(kanji);

	var data = {
		nodes: new vis.DataSet(nodes),
		edges: new vis.DataSet(edges)
	};
	var options = {
		nodes: { shadow:true }, edges: { shadow: true }
	};
	var network = new vis.Network(container, data, options);
	// Automatically draws
	update_details(kanji);
	update_mru(kanji);

	network.on("click", function (params) {
		var nodeId = params.nodes[0];
		// Handle case of a click not on any node
		if (! nodes[nodeId-1]) {
			return;
		}
		var kanji = nodes[nodeId-1].label;
		update_details(kanji);
	});

	// network.on("dragEnd" is problematic: won't release mouse focus

	network.on("doubleClick", function (params) {
		var nodeId = params.nodes[0];
		var kanji = nodes[nodeId-1].label;
		reset_graph(kanji);
	});

	network.selectNodes([1]);
	document.title = "Uchiwake Kanji : " + kanji;
	// Push state only if we are not here due to a popped state
	if (poppedState) {
		poppedState = false;
	}
	else {
		var state = {'k': kanji};
		window.history.pushState(state, null, '/jp/?k=' + kanji); //base URL
	}
}

// Look for an interesting random kanji
function chooseRandom() {
	var keys = Object.keys(kanji_parts);
	var isBoring = true;
	var kanji = '静';
	while (isBoring) {
		kanji = keys[ keys.length * Math.random() << 0];
		if (kanji_parts[kanji].length > 1) {
			break;
		}
	}
	reset_graph(kanji);
}

// Add a link for this kanji to the searched list
// Note: click callback must refer to this.text; 'kanji' is no good, not a closure
function addToSearchedList(kanji) {
	$('<a>',{
		text: kanji,
		title: 'Look up ' + kanji,
		href: '#',
		style: 'padding-right: 0.5em',
		click: function(){ reset_graph(this.text); return false; }
	}).appendTo('#looked_up');
}

// Find all kanji in lookup phrase, create links, and draw the graph.
// For convenience, reset the graph to the first kanji if found.
function lookup() {
	// first, remove any existing
	$('#looked_up a').remove();
	var chars = $("#lookup_kanji").val().split('');
	var alreadyReset = false;
	for (key of chars) {
		if (key in kanji_parts) {
			addToSearchedList(key);
			if (!alreadyReset) {
				reset_graph(key);
				alreadyReset = true;
			}
		}
	}
	// If not already reset, we didn't find anything
	if (!alreadyReset) {
		$('#notFoundString').text($("#lookup_kanji").val());
		$('#modalNotFound').modal('show');
	}
}

// Add a link for a single kanji and draw the graph.
function lookupOne(kanji) {
	if (kanji in kanji_parts) {
		addToSearchedList(kanji);
		reset_graph(kanji);
	}
	else {
		$('#notFoundString').text($("#lookup_kanji").val());
		$('#modalNotFound').modal('show');
	}
}

// Main entry point
// Handle browser back button
window.onpopstate = function(event) {
	poppedState = true;
	if (event.state['k']) {
		reset_graph(event.state['k']);
	}
	else {
		chooseRandom();
	}
};
// Handle /?k=X query param; if not present, choose a random kanji to start with
const urlParams = new URLSearchParams(window.location.search);
const kval = urlParams.get('k');
var paramFound = false;
if (kval) {
	kanji = kval.substr(0,1);
	if (kanji in kanji_parts) {
		reset_graph(kanji);
		paramFound = true;
	}
}
if (!paramFound) {
	chooseRandom();
}

// Look for an interesting random kanji
function displayJLPT() {
	var keys = Object.keys(kanji_parts);
	var isBoring = true;
	var kanji = '静';
	while (isBoring) {
		kanji = keys[ keys.length * Math.random() << 0];
		if (kanji_parts[kanji].length > 1) {
			break;
		}
	}
	reset_graph(kanji);
}