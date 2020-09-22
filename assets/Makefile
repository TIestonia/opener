NODE = node
SASS = ./node_modules/.bin/node-sass --indent-type tab --indent-width 1 --output-style expanded
JAVASCRIPTS = $(patsubst %, public/assets/%.js, page)
BROWSERIFY = ./node_modules/.bin/browserify
WATCHIFY = ./node_modules/.bin/watchify --verbose
NPM_REBUILD = npm --ignore-scripts false rebuild --build-from-source

BROWSERIFY_OPTS =
BROWSERIFY_OPTS += --no-detect-globals

# Vis' files for the browser include requires of related modules with full paths
# that don't match the "browser" field in their package.jsons. E.g. vis-data's
# "browser" field referes to the minified source, but vis-network requires the
# non-minified source.
#
# Currently solved this by setting "vis-data" to require the non-minified
# source in the local package.json.
#BROWSERIFY_OPTS += --no-browser-field

love: compile

compile: stylesheets
compile: javascripts

autocompile:
	$(MAKE) -j2 autojavascripts autostylesheets

stylesheets:
	$(SASS) --output public/assets page.scss

autostylesheets: stylesheets
	$(MAKE) SASS="$(SASS) --watch" "$<"

javascripts: $(JAVASCRIPTS)

autojavascripts:
	@$(MAKE) --always-make -j $(words $(JAVASCRIPTS)) \
		BROWSERIFY="$(WATCHIFY)" $(JAVASCRIPTS)

public/assets:
	mkdir -p "$@"

public/assets/page.js: public/assets
	@echo "Compiling $@…"
	@$(BROWSERIFY) $(BROWSERIFY_OPTS) \
		--require ./$(@F:%.js=%):@opener/$(@F:%.js=%) \
		--outfile "$@"

shrinkwrap:
	npm shrinkwrap --dev

rebuild:
	$(NPM_REBUILD) node-sass --sass-binary-site=http://localhost:0

.PHONY: love
.PHONY: compile autocompile
.PHONY: stylesheets autostylesheets
.PHONY: javascripts autojavascripts
.PHONY: shrinkwrap rebuild
.PHONY: $(JAVASCRIPTS)

# Precious stops Make from deleting files after exiting autocompiling.
.PRECIOUS: $(JAVASCRIPTS)
