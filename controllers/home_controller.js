var _ = require("root/lib/underscore")
var Router = require("express").Router

exports.router = Router({mergeParams: true})

exports.router.get("/", (_req, res) => res.redirect("/procurements"))

_.each({
	"/about": "about_page.jsx",
}, (page, path) => (
	exports.router.get(path, (_req, res) => res.render(page))
))
