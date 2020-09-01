ENV = development
NODE = node
NODE_OPTS = --use-strict --require j6pack/register
NPM_REBUILD = npm --ignore-scripts false rebuild --build-from-source
MOCHA = ./node_modules/.bin/_mocha
TEST = test/**/*_test.js
SHANGE = vendor/shange -f "config/$(ENV).sqlite3"
APP_HOST = dot.ee
APP_PATH = $(error "Please set APP_PATH")
LIVERELOAD_PORT = 35733
JQ_OPTS = --tab

RSYNC_OPTS = \
	--compress \
	--recursive \
	--links \
	--itemize-changes \
	--omit-dir-times \
	--times \
	--delete \
	--prune-empty-dirs \
	--exclude ".*" \
	--exclude "/config/production.json" \
	--exclude "/config/*.sqlite3" \
	--exclude "/assets/***" \
	--exclude "/test/***" \
	--exclude "/node_modules/livereload/***" \
	--exclude "/node_modules/mocha/***" \
	--exclude "/node_modules/co-mocha/***" \
	--exclude "/node_modules/must/***" \
	--exclude "/node_modules/sqlite3/***"

export ENV
export PORT
export LIVERELOAD_PORT

ifneq ($(filter test spec autotest autospec test/%, $(MAKECMDGOALS)),)
	ENV = test
endif

love:
	@$(MAKE) -C assets

web: PORT = 6080
web:
	@$(NODE) $(NODE_OPTS) ./bin/$@

livereload:
	@$(NODE) \
		./node_modules/.bin/livereload public --wait 50 --port $(LIVERELOAD_PORT)

test:
	@$(NODE) $(NODE_OPTS) $(MOCHA) -R dot $(TEST)

spec:
	@$(NODE) $(NODE_OPTS) $(MOCHA) -R spec $(TEST)

autotest:
	@$(NODE) $(NODE_OPTS) $(MOCHA) -R dot --watch $(TEST)

autospec:
	@$(NODE) $(NODE_OPTS) $(MOCHA) -R spec --watch $(TEST)

shrinkwrap:
	npm shrinkwrap --dev

rebuild:
	$(NPM_REBUILD) sqlite3

config/%.sqlite3:
	sqlite3 "$@" < db/schema.sql

db/create: config/$(ENV).sqlite3

db/status:
	@$(SHANGE) status

db/migrate:
	@$(SHANGE) migrate
	@$(SHANGE) schema > db/schema.sql

db/migration: NAME = $(error "Please set NAME.")
db/migration:
	@$(SHANGE) create "$(NAME)"

deploy:
	@rsync $(RSYNC_OPTS) . "$(APP_HOST):$(or $(APP_PATH), $(error "APP_PATH"))/"

production: APP_PATH = www/opener
production: deploy

.PHONY: love
.PHONY: test spec autotest autospec
.PHONY: shrinkwrap rebuild
.PHONY: deploy production
