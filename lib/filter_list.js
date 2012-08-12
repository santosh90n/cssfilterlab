(function(){

    function FilterList(config) {
        this.config = config;
        this.container = $("#filter-list");
        this.filterStock = $("#filter-stock");
        this.filterMessageEl = $("#filter-list-empty");
        this.lastFilterId = 0;
        this.filters = [];
        this.filtersById = {};
        this.makeDragable();
        this.generateFilterItems();
        this.updateFilterCount();
    }

    function isBuiltin(config) {
        var type = config.type ? config.type.fn : "custom";
        return type != "custom";
    }

    function fixConfig(filterName, config) {
        if (!config.name)
            config.name = filterName;
        config.isBuiltin = isBuiltin(config);
        $.each(config.params, function (name) {
            var filterParam = config.config[name],
                type = filterParam.type || 'range',
                mixer = (type == 'hidden' || type == 'unknown') ?
                        Global.mixers.dontMix :
                        Global.mixers.mixNumber,
                generator = filterParam.generator || "identity";
            if (filterParam.mixer) {
                if (filterParam.mixer.fn)
                    mixer = Global.mixers[filterParam.mixer.fn].apply(config, filterParam.mixer.params);
                else
                    mixer = Global.mixers[filterParam.mixer];
            }
            filterParam.mixer = mixer;
            filterParam.generator = Global.CSSGenerators[generator] || Global.CSSGenerators.identity;
        });
        return config;
    }

    FilterList.prototype = {
        generateFilterItems: function() {
            var self = this;
            this.availableFilters = [];
            this.availableFiltersByName = {};
            $.each(this.config.filters, function(filterName, filterConfig) {
                filterConfig = fixConfig(filterName, filterConfig);
                self.availableFilters.push(filterConfig);
                self.availableFiltersByName["_" + filterName] = filterConfig;
            });
            // Order by the builtin filters first.
            this.availableFilters.sort(function(a, b) {
                if (a.isBuiltin == b.isBuiltin)
                    return a.name.localeCompare(b.name);
                return a.isBuiltin ? -1 : 1;
            });
            $.each(this.availableFilters, function(i, filterConfig) {
                var el = $("<li />").text(filterConfig.name)
                    .addClass(filterConfig.isBuiltin ? "builtin-filter" : "custom-filter")
                    .click(function() {
                        self.addFilter(filterConfig);
                    })
                    .appendTo(self.filterStock);
            });
        },

        allocateNewName: function(filterConfig) {
            var name = filterConfig.name;
            while (this.filterByName(name))
                name = filterConfig.name + (++this.lastFilterId);
            return name;
        },

        filterByName: function(name) {
            return this.filtersById["_" + name];
        },

        addFilter: function(filterConfig, filterName) {
            if (!filterName)
                filterName = this.allocateNewName(filterConfig);
            var filter = new Global.Filter(this, filterName, filterConfig);
            this.filters.push(filter);
            this.filtersById["_" + filterName] = filter;
            this.updateFilterCount();

            var itemEl = filter.generateFilterItem();
            $(itemEl).data("filter", filter);
            this.container.append(itemEl);
            
            if (this.animation) {
                this.animation.addFilterDefaultValues(filter);
                this.animation.update();
            }

            filter.setActive(true);
        },

        removeFilter: function(filter) {
            var index = this.filters.indexOf(filter);
            if (index < 0)
                return;
            this.filters.splice(index, 1);
            delete this.filtersById["_" + filter.name];
            var self = this;
            filter.el.slideUp(100, function() {
                filter.el.remove();
                self.updateFilterCount();
            });
            if (this.animation) {
                this.animation.removeFilterValue(filter);
                this.animation.update();
            }
        },

        updateFilterCount: function() {
            this.filterMessageEl.toggle(!this.filters.length);
        },

        reload: function(filters) {
            var self = this;
            $.each(this.filters, function(i, filter) {
                filter.el.remove();
            });
            this.filters = [];
            $.each(filters, function(i, filter) {
                var filterConfig = self.availableFiltersByName["_" + filter.type];
                if (!filterConfig)
                    return;
                self.addFilter(filterConfig, filter.name);
            });
            this.updateFilterCount();
        },

        makeDragable: function() {
            var self = this;
            this.container.sortable({
                distance: 15,
                axis: 'y',
                items: 'li',
                handle: '.dragpoint',
                start: function(event, ui) {
                    ui.helper.addClass("dragging");
                },
                beforeStop: function(event, ui) {
                    ui.helper.removeClass("dragging");
                },            
                update: function(event, ui) {
                    $(this).find("li").each(function (index, el) {
                        var filter = $(el).data("filter");
                        if (filter)
                            filter.order = index;
                    });
                    self.filters.sort(function(a, b) { return a.order - b.order; });
                    if (self.animation) {
                        self.animation.updateFilters();
                        self.animation.saveAnimation();
                    }
                }
            });
        },

        activeFilters: function() {
            return $.grep(this.filters, function(filter) {
                return filter.active;
            });
        },

        defaultValues: function() {
            var values = {};
            $.each(this.filters, function(i, filter) {
                values[filter.name] = filter.defaultValues();
            });
            return values;
        },

        setSource: function(keyframe) {
            this.keyframe = keyframe;
            var source = keyframe.value;
            $.each(this.filters, function(i, filter) {
                if (!filter.active)
                    return;
                filter.setSource(source[filter.name]);
            });
        },

        valuesUpdated: function(filter, paramName) {
            if (!this.animation || !this.keyframe)
                return;
            this.animation.keyframeUpdated(this.keyframe, filter, paramName);
        },

        onFilterStateChange: function(filter) {
            if (this.animation)
                this.animation.onFilterStateChange(filter);
        }
    }
    

    Global.FilterList = FilterList;
})();