var VisNetwork = require("vis-network").Network
var VisDataSet = require("vis-data").DataSet
var TI_BLUE = "#3695d8"
var FONT_FAMILY = "Lato, Helvetica, Arial, sans-serif"

exports.visualize = function(el, graph) {
  new VisNetwork(el, {
		nodes: new VisDataSet(graph.nodes),
		edges: new VisDataSet(graph.edges)
	}, {
		interaction: {
			navigationButtons: true,
			zoomView: false,
			hover: true
		},

		physics: {
			solver: "forceAtlas2Based"
		},

		layout: {randomSeed: 0},

		nodes: {
			color: "white",
			shape: "box",
			margin: 10,
			mass: 1,
			font: {face: FONT_FAMILY}
		},

		edges: {
			color: TI_BLUE,
			font: {
				size: 14,
				face: FONT_FAMILY,
				align: "bottom",
				strokeColor: "white",
				strokeWidth: 4
			}
		},

		groups: {
			procurement: {
				mass: 3,
				value: 4,
				margin: 15,
				shape: "circularImage",
				size: 44,
				imagePadding: 18,
				image: "/assets/procurement.svg",
				font: {size: 20}
			},

			buyer: {
				mass: 1.5,
				value: 3,
				font: {
					size: 17,
					multi: "html",
					ital: {color: "#878787"}
				}
			},

			seller: {
				mass: 1.5,
				value: 3,
				font: {
					size: 17,
					multi: "html",
					ital: {color: "#878787"}
				}
			},

			"political-party": {
				mass: 1.5,
				value: 2,
				shape: "image",
				imagePadding: 7,

				size: 25,

				font: {
					size: 17,
					strokeColor: "white",
					strokeWidth: 4
				}
			},

			person: {
				shape: "circularImage",
				imagePadding: 7,

				font: {
					ital: {color: "#878787"},
					strokeColor: "white",
					strokeWidth: 4
				}
			}
		}
	})
}
