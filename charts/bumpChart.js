(function(){

	var stream = raw.model();

	var group = stream.dimension()
		.title('Group')
		.required(1)
	;
	
	var date = stream.dimension()
		.title('Date')
		.types(Number, Date, String)
		.accessor(function(d) {
			return this.type() == "Date" ? Date.parse(d) : this.type() == "String" ? d : +d;
		})
		.required(1)
	; 

    var size = stream.dimension()
        .title('Size')
        .types(Number)
        .required(1);

	stream.map(function (data){
		if (!group()) return [];

		var dates = d3.set(data.map(function (d){ return date(d); })).values();

		var groups = d3.nest()
			//.key(group)
			.key(function(d) {return group(d);})
			.rollup(function (g) {
                var singles = d3.nest()
                    .key(function(d) {
                    	var zzz1 = date(d);
                    	return date(d);
                    })
                    .rollup(function (d){
                    	var zzz2 = size(d[0]);
                    	var zzz3 = d3.sum(d,size);
                        return {
                            group : group(d[0]),//d[0] because d is an array of one object.
                            x : date(d[0]),
                            y : size() ? d3.sum(d,size) : d.length
                            //y : size(d[0])
                        };
                    })
                    .map(g);

                // let's create the empty ones
                dates.forEach(function(d){
                    if (!singles.hasOwnProperty(d)) {
                        singles[d] = { group : group(g[0]), x : d, y : 0 };
                    }
                });

                return d3.values(singles);
            })
            .map(data);

			var xxx = d3.values(groups)//gets an array of the points for each group
				.map(function(d) {
					return d.sort(function(a,b) {
						return a.x - b.x; //this orders the points for each group by date.
					});
				})
			;
        return d3.values(groups).map(function(d){ return d.sort(function(a,b){ return a.x - b.x; }); });

    });

    var chart = raw.chart()
        .title('Bump Chart')
        .thumbnail("imgs/bumpChart.png")
        .description(
            "For continuous data such as time series, a bump chart can be used in place of stacked bars. Based on New York Times's <a href='http://www.nytimes.com/interactive/2014/08/13/upshot/where-people-in-each-state-were-born.html'>interactive visualization.</a>")
        .category('Time series')
        .model(stream);

    var width = chart.number()
        .title("Width")
        .defaultValue(1400)
        .fitToWidth(false);

    var height = chart.number()
        .title("Height")
        .defaultValue(800);

    var padding = chart.number()
        .title("Padding")
        .defaultValue(1);

    var normalize = chart.checkbox()
        .title("Normalize")
        .defaultValue(false);

	var curve = chart.list()
		.title("Interpolation")
		.values(['Basis','Sankey','Linear'])
		.defaultValue('Basis')
	;

    var sort = chart.list()
        .title("Sort by")
        .values(['value (descending)', 'value (ascending)', 'group'])
        .defaultValue('value (descending)');

    var showLabels = chart.checkbox()
        .title("Show labels")
        .defaultValue(true);

    var showGrid = chart.checkbox()
        .title("Show grid")
        .defaultValue(true);

    var colors = chart.color()
        .title("Color scale");

    chart.draw(function (selection, data){

		var g = selection
			.attr("width", +width() )
			.attr("xmlns:xmlns:xlink", "http://www.w3.org/1999/xlink")
			.attr("height", +height() )
			/*
			.on("mouseout", function(d) {
				console.log(d3.event.toElement);
				if (d3.select(d3.event.toElement).attr("id") == "chart") {
					g.selectAll("path.layer")
						.style("fill-opacity", .7)
					;
					g.selectAll("text.label")
						.style("fill", "black")
					;
				}
			})
			*/
			.append("g")
		;
        var layers = data;

        var curves = {
          'Basis' : 'basis',
          'Sankey' : interpolate,
          'Linear' : 'linear'
        };

		layers[0].forEach(function(d,i){
			var values = layers.map(function(layer){
				return layer[i];
			})
			.sort(sortBy);
			var sum = d3.sum(values, function(layer) {
				return layer.y;
			});
			var y0 = 0;
			values.forEach(function(layer){
				if (normalize()) {
					layer.y *= 100 / sum;
				}
				layer.y0 = y0;
				y0 += layer.y + padding();
			});
		});


		if (date() && date.type() == "Date") {
			var x = d3.time.scale()
				.domain([
					d3.min(layers, function(layer) {
						return d3.min(layer, function(d) {
							return d.x;
						});
					}),
					d3.max(layers, function(layer) {
						return d3.max(layer, function(d) {
							return d.x;
						});
					})
				])
				.range([0, +width()])
			;
		} else if (date() && date.type() == "String") {
			var x = d3.scale.ordinal()
				.domain(layers[0].map(function(d){ return d.x; }) )
				.rangePoints([0, +width()],0)
			;
		} else {
			var x = d3.scale.linear()
				.domain([
					d3.min(layers, function(layer) {
						return d3.min(layer, function(d) {
							return d.x;
						});
					}),
					d3.max(layers, function(layer) {
						return d3.max(layer, function(d) {
							return d.x;
						});
					})
				])
				.range([0, +width()])
			;
		}

		var y = d3.scale.linear()
			.domain([0, d3.max(layers, function(layer) {
				return d3.max(layer, function(d) {
					return d.y0 + d.y;
				});
			})])
			.range([+height()-20, 0])
		;

		// to be improved
		layers[0].forEach(function(d,i){//for each x...
			var values = layers.map(function(layer){//get all the values at the current x
				return layer[i];
			})
			.sort(sortBy);//sort, probably by y
			var sum = d3.sum(values, function(layer){ return layer.y; });//sum y values
			var y0 = 0;
			if (!normalize()) {
				var y0 = -sum/2 + y.invert( (+height()-20)/2 ) - padding()*(values.length-1)/2;
			}
			values.forEach(function(layer){
				if (normalize()) {
					layer.y *= 100 / sum;
				}
				layer.y0 = y0;
				y0 += layer.y + padding();
			});
		});

        var xAxis = d3.svg.axis().scale(x).tickSize(-height()+20).orient("bottom");

        g.append("g")
            .attr("class", "x axis")
            .style("stroke-width", "1px")
            .style("font-size","10px")
            .style("font-family","Arial, Helvetica")
            .attr("transform", "translate(" + 0 + "," + (height()-20) + ")")
            .style("display",function(){ return showGrid() ? 'block' : 'none'; })
            .call(xAxis);

        d3.selectAll(".x.axis line, .x.axis path")
            .style("shape-rendering","crispEdges")
            .style("fill","none")
            .style("stroke","#ccc");

        colors.domain(layers, function (d){ return d[0].group; });

		var area = d3.svg.area()
			.interpolate(curves[curve()])
			.x(function(d) { return x(d.x); })
			.y0(function(d) { return y(d.y0); })
			.y1(function(d) {
				return Math.min(y(d.y0)-1, y(d.y0 + d.y));//The range is upside down
			});

		var line = d3.svg.line()
			.interpolate(curves[curve()])
			.x(function(d) { return x(d.x); })
			.y(function(d) {//mid point between y0 and y?
				var y0 = y(d.y0);
				var y1 = y(d.y0 + d.y);
				//return y0 + (y1 - y0) * 0.5;
				return (y0+y1)/2;
			})
		;

		function highlight(d) {
			g.selectAll("path.layer")
				.style("fill-opacity", function(dd) {
					if (d == dd) {return 1;} else {return .1;}
				})
			;
			g.selectAll("text.label")
//				.style("fill", function(dd) {
//					if (d == dd) {return "black";} else {return "#cccccc";}
//				})
				.style("visibility", function(dd) {
					if (d == dd) {return "visible";} else {return "hidden";}
				})
			;
		}
		function unHighlight() {
			g.selectAll("path.layer")
				.style("fill-opacity", .7)
			;
//			g.selectAll("text.label")
//				.style("fill", "black")
//			;
			g.selectAll("text.label")
				.style("visibility", "visible")
			;
		}

		//var mouseoverTimeout = null;
		g.selectAll("path.layer")
			.data(layers)
			.enter().append("path")
				.attr("class","layer")
				.attr("d", area)
				.attr("title", function (d){ return d[0].group; })
				.style("fill-opacity",.7)
				.style("fill", function (d) { return colors()(d[0].group); })
				.on("click", function(d) {
					d3.event.stopPropagation();
					if (d.selected) {
						g.selectAll("path.layer").each(function(d) {d.selected = null;});
						unHighlight();
					} else {
						g.selectAll("path.layer").each(function(d) {d.selected = false;});
						d.selected = true;
					}
				})
				.on("mouseover", function(d) {
					d3.event.stopPropagation();
					if (d.selected == null) {
						highlight(d);
					}
				})
				.on("mouseout", function(d) {
					d3.event.stopPropagation();
					if (d3.select(d3.event.toElement).attr("id") != "topicLabel") {
						if (d.selected == null) {
							unHighlight();
						}
					}
				})
			;

        if (!showLabels()) return;

        g.append('defs');

		function textpathName(d, i) {
			return 'path-' + i;
		}
		function textpathHref(d, i) {
			return '#path-' + i;
		}
		
		g.select('defs').selectAll('path').data(layers).enter().append('path')
			//.attr('id', function(d,i) { return 'path-' + i; })
			.attr('id', textpathName)
			.attr('d', line)
		;

        g.selectAll("text.label").data(layers).enter().append('text')
            .attr('dy', '0.5ex')
            .attr("class","label")
            .append('textPath')
            	.attr("id", "topicLabel")
            	.attr('xlink:xlink:href', textpathHref)
            	.attr('startOffset', function(d) {
                	var maxYr = 0, maxV = 0;
                	d3.range(layers[0].length).forEach(function(i) {//Find the fatest part of the shape
                    	if (d[i].y > maxV) {
                        	maxV = d[i].y;
                        	maxYr = i;
                    	}
                	});
                	//d.maxVal = d[maxYr].y;Don't need this
                	d.offset = Math.round(x(d[maxYr].x) / x.range()[1] * 100);
                	return Math.min(95, Math.max(5, d.offset))+'%';
            	})
            	.attr('text-anchor', function(d) {
                	return d.offset > 90 ? 'end' : d.offset < 10 ? 'start' : 'middle';
            	})
            	.text(function(d){ return d[0].group; })
            	.style("font-size","11px")
            	.style("font-family","Arial, Helvetica")
            	.style("font-weight","normal");

        function sortBy(a,b){
            if (sort() == 'value (descending)') return a.y - b.y;
            if (sort() == 'value (ascending)') return b.y - a.y;
            if (sort() == 'group') return a.group - b.group;
        }

        function interpolate(points) {
          var x0 = points[0][0], y0 = points[0][1], x1, y1, x2,
              path = [x0, ",", y0],
              i = 0,
              n = points.length;

          while (++i < n) {
            x1 = points[i][0], y1 = points[i][1], x2 = (x0 + x1) / 2;
            path.push("C", x2, ",", y0, " ", x2, ",", y1, " ", x1, ",", y1);
            x0 = x1, y0 = y1;
          }
          return path.join("");
        }
    });

})();
