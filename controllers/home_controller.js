var _ = require("root/lib/underscore")
var Router = require("express").Router

exports.router = Router({mergeParams: true})

_.each({
	"/": "home_page.jsx",
	"/about": "about_page.jsx",
}, (page, path) => (
	exports.router.get(path, (_req, res) => res.render(page))
))
