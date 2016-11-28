$(function () {

    var DEFAULTS = {
        tick_count          : 10,
        x_tick_count        : 16,
        bar_color           : '#8cd1c4',
        bar_width           : 2,
        top_circle_radius   : 6,
        x_offset            : 10,
        legend_width        : 0,
        brush_height        : 200,
        graph_width         : 800,
        graph_height        : 500
    };

    var Data = (function () {
        var _data = {};

        return {
            set: function (d) {
                _data = d;
            },

            get: function () {
                return _data;
            }
        }
    })();

    var margin = {top: 20, right: 20, bottom: 50, left: 60},
        width = DEFAULTS.graph_width - margin.left - margin.right,
        height = DEFAULTS.graph_height - margin.top - margin.bottom;

    // We need globally defined Tip
    var Tip;

// set the ranges
    var x = d3.scaleLinear()
        .range([0, width]);

    var x2 = d3.scaleLinear()
        .range([0, width]);

    var y = d3.scaleLinear()
        .range([height, 0]);

// append the svg object to the body of the page
// append a 'group' element to 'svg'
// moves the 'group' element to the top left margin
    var svg = d3.select(".scatter-plot").append("svg")
        .attr("width", width + margin.left + margin.right + DEFAULTS.legend_width)
        .attr("height", height + margin.top + margin.bottom + DEFAULTS.brush_height)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    var stages_visibility_map = {};
    var disease_visibility_map = {};
    var gender_visibility_map = {};

    var color20 = d3.scaleOrdinal(d3.schemeCategory20c);

    var DOT_SHAPE = d3.symbol().type(function(d){
        if (d.case_gender === 'MALE') {
            return d3.symbolTriangle;
        }
        return d3.symbolSquare;
    });

// get the data
    d3.tsv("../tcga-cases.tsv", function (error, d) {
        if (error) throw error;

        Data.set(d);

        parseData();
        intiTooltips();
        createPlot();
        add_legend();

    });

    var parseData = function () {
        var data = Data.get();

        // parse unique disease types and cash then in a hit map
        var _uniqDisease =_.uniqBy(data, 'case_disease_type');
        _.forEach(_uniqDisease, function (d) {
            disease_visibility_map[d.case_disease_type] = true;
        });

        var _stages = _.uniqBy(data, 'case_pathologic_stage');
        _.forEach(_stages, function (d) {
            var _stage = d.case_pathologic_stage;
            stages_visibility_map[_stage] = true;
        });

        var _genders = _.uniqBy(data, 'case_gender');
        _.forEach(_genders, function (d) {
            var _gender = d.case_gender;
            gender_visibility_map[_gender] = true;
        });

        color20.domain(_stages.map(function(d) {return d.case_pathologic_stage}));
    };

    var createPlot = function () {
        var data = Data.get();
        //axes domains
        x.domain([d3.min(data, function (d) { return +d.case_days_to_death; }), d3.max(data, function (d) { return +d.case_days_to_death; })]);
        x2.domain([d3.min(data, function (d) { return +d.case_days_to_death; }), d3.max(data, function (d) { return +d.case_days_to_death; })]);
        y.domain([d3.min(data, function (d) { return +d.case_age_at_diagnosis; }), d3.max(data, function(d) { return +d.case_age_at_diagnosis; })]);

        // Add the scatterplot
        svg.selectAll(".dot")
            .data(data)
            .enter().append("path")
            .attr('class', 'dot')
            .attr('stroke', function (d) {return color20(d.case_pathologic_stage); })
            .attr('d', DOT_SHAPE)
            .attr("transform", function(d) { return "translate(" + x(d.case_days_to_death) + "," + y(d.case_age_at_diagnosis) + ")"; })
            .on('mouseover', Tip.show)
            .on('mouseout', Tip.hide);


        var xAxis = d3.axisBottom(x).ticks(DEFAULTS.x_tick_count);
        var yAxis = d3.axisLeft(y).ticks(DEFAULTS.tick_count);
        // Add the X Axis
        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .attr('class', 'axis x')
            .call(xAxis);
        // Add the Y Axis
        svg.append("g")
            .attr('class', 'axis y')
            .call(yAxis);

        svg.append("text")
            .attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
            .attr("transform", "translate("+ (-35) +","+(height/2)+")rotate(-90)")  // text is drawn off the screen top left, move down and out and rotate
            .attr('class', 'axis-label')
            .text("Age at diagnosis");

        svg.append("text")
            .attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
            .attr("transform", "translate("+ (width/2) +","+(height+(40))+")")  // centre below axis
            .attr('class', 'axis-label')
            .text("Days to death");

        /**
         * Brush
         */

        var brush = d3.select(".scatter-plot svg");

        height = height + 120;

        brush.append("g")
            .attr("class", "axis axis--grid")
            .attr("transform", "translate("+ margin.left +"," + height + ")")
            .call(d3.axisBottom(x2)
                .ticks(DEFAULTS.x_tick_count));

        brush.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate("+ margin.left +"," + height + ")")
            .call(d3.axisBottom(x2));

        brush.append("g")
            .attr("transform", "translate("+ margin.left +"," + height + ")")
            .attr("class", "brush")
            .call(d3.brushX()
                .extent([[0, -50], [width, 0]])
                .on("end", brushended));

        function brushended(e) {

            if (!d3.event.sourceEvent) return; // Only transition after input.

            var selection = d3.event.selection || x2.range() ;

            x.domain(selection.map(x2.invert, x2));

            var _range = x.range();

            svg.selectAll(".dot")
                .attr("transform", function(d) {

                    var _x = x(d.case_days_to_death);
                    var _y = y(d.case_age_at_diagnosis);

                    if ( _x < _range[0]  || _x > _range[1] ) { // optimisation, move only affected
                        return;
                    }

                    return "translate(" + _x + "," + _y + ")";
                })
                .attr('visibility', visibility_func);

            svg.select(".axis.x").transition().duration(150).call(xAxis);
        }
    };

    var intiTooltips = function () {
        // Define the div for the tooltip
        Tip = d3.tip()
            .attr('class', 'd3-tip')
            .offset([-10, 0])
            .html(function (d) {

                html = '';
                html += '<p><span class="label">Age at diagnosis</span>:   ' + d.case_age_at_diagnosis + "</p>";
                html += '<p><span class="label">Days to death</span>:   ' + d.case_days_to_death + "</p>";
                html += '<p><span class="label">Gender </span>:   ' + d.case_gender + "</p>";
                html += '<p><span class="label">Disease Type</span>:   ' + d.case_disease_type + "</p>";
                html += '<p><span class="label">Pathological Stage</span>:   ' + d.case_pathologic_stage + "</p>";

                return html;
            });

        Tip.direction(function(d) {
            return 'se';
        });

        svg.call(Tip);
    };

    var visibility_func = function (d) {
        var _range = x.range();

        var _x = x(d.case_days_to_death);

        if (( _x < _range[0] || _x > _range[1] ) || !_filter_data_point(stages_visibility_map, gender_visibility_map, disease_visibility_map, d)) { // optimisation
            return 'hidden';
        }


        return 'visible';
    };

    /**
     * Legend
     */
    function add_legend() {

        /**
         * Stage legend
         */
        var stage_legend = d3.select('.stage-legend')
            .selectAll('.legend--item')
            .data(_.map(stages_visibility_map, function (val, key) {
                return key;
            }).sort())
            .enter()
            .append('p')
            .attr('class', 'legend--item clickable');

        stage_legend
            .append('input')
            .attr('type', 'checkbox')
            .attr('value', function (d) {
                return d;
            })
            .attr('checked', 'true');

        stage_legend.append('span')
            .attr('class', 'legend--item-color')
            .attr('style', function (d, i) { return 'background-color: ' + color20(i); });

        stage_legend.append('span')
            .text(function (d) {
                return d;
            });

        stage_legend.on('click', function (d) {
            var $checkbox = $(this).find("input[type='checkbox']");
            var checked = $checkbox.is(':checked');
            $checkbox.prop('checked', !checked);
            stages_visibility_map[d] = !checked;
            filter_data();
        });

        /**
         * Gender Legend
         */
        var gender_legend = d3.select('.gender-legend')
            .selectAll('.gender-legened--item')
            .data(_.map(gender_visibility_map, function (val, key) {
                return {case_gender: key};
            }).sort())
            .enter()
            .append('p')
            .attr('class', 'gender-legend--item clickable');

        gender_legend
            .append('input')
            .attr('type', 'checkbox')
            .attr('value', function (d) {
                return d.case_gender;
            })
            .attr('checked', 'true');

        var gender_icon_svg = gender_legend
            .append('svg')
            .attr('width', 15)
            .attr('height', 15);

        var path_wrap = gender_icon_svg.append('g')
            .attr('transform', 'translate(7,10)');

        path_wrap.append('path')
            .attr('class', 'dot')
            .attr('d', DOT_SHAPE)
            .attr('fill', '#bbbdbb')
            .attr('stroke','#bbbdbb')
            .attr('stroke-width',1);

        gender_legend.append('span')
            .text(function (d) {
                return d.case_gender;
            });

        gender_legend.on('click', function (d) {
            var $checkbox = $(this).find("input[type='checkbox']");
            var checked = $checkbox.is(':checked');
            $checkbox.prop('checked', !checked);
            gender_visibility_map[d.case_gender] = !checked;
            filter_data();
        });

        /**
         * Disease type legend
         */

        var disease_legend = d3.select('.disease-legend')
            .selectAll('.legend--item')
            .data(_.map(disease_visibility_map, function (val, key) {
                return key;
            }).sort())
            .enter()
            .append('p')
            .attr('class', 'legend--item clickable');

        disease_legend
            .append('input')
            .attr('type', 'checkbox')
            .attr('value', function (d) {
                return d;
            })
            .attr('checked', 'true');

        disease_legend.append('span')
            .text(function (d) {
                return d;
            });

        disease_legend.on('click', function (d) {
            var $checkbox = $(this).find("input[type='checkbox']");
            var checked = $checkbox.is(':checked');
            $checkbox.prop('checked', !checked);
            disease_visibility_map[d] = !checked;
            filter_data();
        });

    }

    var _filter_data_point = function (stage_map, gender_map, disease_map, d) {
        return  stage_map[d.case_pathologic_stage] && gender_map[d.case_gender] && disease_map[d.case_disease_type];
    };

    var filter_data = function () {
        svg.selectAll(".dot")
            .attr('visibility', visibility_func);
    };

});