ENV = development
NODE = node
NODE_OPTS = --use-strict --require j6pack/register
NPM_REBUILD = npm --ignore-scripts false rebuild --build-from-source
MOCHA = ./node_modules/.bin/_mocha
TEST = test/**/*_test.js
SHANGE = vendor/shange -f "config/$(ENV).sqlite3"
APP_HOST = $(error "Please set APP_HOST")
APP_PATH = $(error "Please set APP_PATH")
LIVERELOAD_PORT = 35733
JQ_OPTS = --tab
RIK_URL = https://ariregxmlv6.rik.ee

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
	--exclude "/config/development.json" \
	--exclude "/config/staging.json" \
	--exclude "/config/production.json" \
	--exclude "/config/*.sqlite3" \
	--exclude "/assets/***" \
	--exclude "/test/***" \
	--exclude "/node_modules/livereload/***" \
	--exclude "/node_modules/mocha/***" \
	--exclude "/node_modules/co-mocha/***" \
	--exclude "/node_modules/must/***" \
	--exclude "/node_modules/sqlite3/***" \
	--exclude "/tmp/***"

LFTP_MIRROR_OPTS = \
	--verbose=1 \
	--parallel=4 \
	--delete \
	--exclude (^\|/)\. \
	--exclude ^app\.js$ \
	--exclude ^config/development\.json$$ \
	--exclude ^config/production\.json$$ \
	--exclude ^config/[^.]+\.sqlite3$$ \
	--exclude ^assets/ \
	--exclude ^test/ \
	--exclude ^node_modules($$\|/) \
	--exclude ^node_modules/livereload/ \
	--exclude ^node_modules/mocha/ \
	--exclude ^node_modules/co-mocha/ \
	--exclude ^node_modules/must/ \
	--exclude ^node_modules/sqlite3/ \
	--exclude ^tmp/

export ENV
export PORT
export LIVERELOAD_PORT

ifneq ($(filter test spec autotest autospec test/%, $(MAKECMDGOALS)),)
	ENV = test
endif

define config
$(shell ENV=$(ENV) node -e 'console.log(require("./config").$1)')
endef

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

staging: APP_PATH = www/opener
staging:
	@rsync $(RSYNC_OPTS) . "$(APP_HOST):$(or $(APP_PATH), $(error "APP_PATH"))/"

production: APP_HOST = opener.ee
production: APP_PATH = www/opener-2020
production:
	lftp "$(APP_HOST)" \
		-e "mirror --reverse $(LFTP_MIRROR_OPTS) . $(APP_PATH); exit"

tmp:
	mkdir -p tmp

tmp/estonian_organization_roles.xml: tmp
tmp/estonian_organization_roles.xml: scripts/estonian_classifiers_request.xml
	@cat "$<" |\
	sed -e "s/\$$USER/$(call config,estonianBusinessRegisterUser)/" |\
	sed -e "s/\$$PASSWORD/$(call config,estonianBusinessRegisterPassword)/" |\
	http post $(RIK_URL) Content-Type:application/soap+xml | xml format > "$@"

.PHONY: love
.PHONY: test spec autotest autospec
.PHONY: shrinkwrap rebuild
.PHONY: staging production
