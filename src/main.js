$(function () {

    var DEFAULTS = {
        tick_count: 10,
        x_tick_count: 16,
        bar_color: '#8cd1c4',
        bar_width: 2,
        top_circle_radius: 6,
        x_offset: 10,
        legend_width: 0,
        brush_height: 200,

        graph_width: 800,
        graph_height: 500
    };

    var margin = {top: 20, right: 20, bottom: 50, left: 60},
        width = DEFAULTS.graph_width - margin.left - margin.right,
        height = DEFAULTS.graph_height - margin.top - margin.bottom;

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
    // Define the div for the tooltip
    var tip = d3.tip()
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

    tip.direction(function(d) {
        // var _x = x(d.case_days_to_death);
        // var _y = x(d.case_age_at_diagnosis);
        // var _x_range = x.range();
        // var _y_range = x.range();
        //
        // var _pos = 'n';
        //
        // if (_y < _y_range[1] / 3) {
        //     _pos = 's';
        // }
        //
        // if (_x < _x_range[1] / 3) {
        //     _pos = 'se'
        // }
        var _pos = 'se';

        return _pos;
    });

    svg.call(tip);

    var STAGES = [
        'I or II NOS',
        'Not available',
        'Stage 0',
        'Stage I',
        'Stage IA',
        'Stage IB',
        'Stage II',
        'Stage IIA',
        'Stage IIB',
        'Stage IIC',
        'Stage III',
        'Stage IIIA',
        'Stage IIIB',
        'Stage IIIC',
        'Stage IS',
        'Stage IV',
        'Stage IVA',
        'Stage IVB',
        'Stage IVC',
        'Stage Tis',
        'Stage X'
    ];

    var stages_visibility_map = {};
    var disease_visibility_map = {};

    _.forEach(STAGES, function (stage) {
        stages_visibility_map[stage] = true;
    });

    var gender_visibility_map = {
        'MALE': true,
        'FEMALE': true
    };

    var symbol = d3.symbol();

    var color20 = d3.scaleOrdinal(d3.schemeCategory20c);

    var DOT_SHAPE = symbol.type(function(d){


        if (d.case_gender === 'MALE') {
            //return d3.symbolDiamond;
            return d3.symbolTriangle;

        }
        // //return d3.symbolDiamond;
        //return d3.symbolCircle;
        //return d3.symbolStar;
        //return d3.symbolTriangle;
        return d3.symbolSquare;
        //return d3.symbolCross;
    });
// get the data
    d3.tsv("../tcga-cases.tsv", function (error, d) {
        if (error) throw error;

        var data = _.filter(d, function (item) {
            return item.case_days_to_death !== '0' && d.case_age_at_diagnosis !== '0';
        });

        // parse unique disease types and cash then in a hit map
        var _uniqDisease =_.uniqBy(data, 'case_disease_type');
        _.forEach(_uniqDisease, function (d) {
            disease_visibility_map[d.case_disease_type] = true;
        });

        x.domain([d3.min(data, function (d) { return +d.case_days_to_death; }), d3.max(data, function (d) { return +d.case_days_to_death; })]);
        x2.domain([d3.min(data, function (d) { return +d.case_days_to_death; }), d3.max(data, function (d) { return +d.case_days_to_death; })]);

        y.domain([d3.min(data, function (d) { return +d.case_age_at_diagnosis; }), d3.max(data, function(d) { return +d.case_age_at_diagnosis; })]);

        // Add the scatterplot
        svg.selectAll(".dot")
            .data(data)
            .enter().append("path")
            .attr('class', 'dot')
            .attr('stroke', function (d) { var index = STAGES.indexOf(d.case_pathologic_stage); return color20(index); })
            .attr('d', DOT_SHAPE)
            .attr("transform", function(d) { return "translate(" + x(d.case_days_to_death) + "," + y(d.case_age_at_diagnosis) + ")"; })
            .on('mouseover', tip.show)
            .on('mouseout', tip.hide);


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

                    var _x = x(d.case_days_to_death),
                        _y = y(d.case_age_at_diagnosis);

                    if ( _x < _range[0]  || _x > _range[1] ) { // optimisation, move only affected
                        return;
                    }

                    return "translate(" + _x + "," + _y + ")";
                })
                .attr('visibility', visibility_func);

        }

        add_legend();

    });


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
            .data(STAGES)
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
            .data([{case_gender: 'MALE'}, {case_gender: 'FEMALE'}])
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