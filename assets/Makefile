NODE = node
SASS = ./node_modules/.bin/node-sass --indent-type tab --indent-width 1 --output-style expanded
NPM_REBUILD = npm --ignore-scripts false rebuild --build-from-source

BROWSERIFY_OPTS =
BROWSERIFY_OPTS += --no-detect-globals

love: stylesheets

stylesheets:
	$(SASS) --output public/assets page.scss

autostylesheets: stylesheets
	$(MAKE) SASS="$(SASS) --watch" "$<"

public/assets:
	mkdir -p "$@"

shrinkwrap:
	npm shrinkwrap --dev

rebuild:
	$(NPM_REBUILD) node-sass --sass-binary-site=http://localhost:0

.PHONY: love
.PHONY: stylesheets autostylesheets
.PHONY: shrinkwrap rebuild
