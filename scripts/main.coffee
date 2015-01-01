angular.module('App', ['ui.jq']).controller 'AppCtrl', ($scope, $timeout) ->

	@perClass = true
	@uploaded = {}
	charts = new jmhc.Charts(@perClass)

	@resetCharts = ->
		charts = new jmhc.Charts(@perClass)
		for _, file of @uploaded
			for b in file.benchmarks then charts.addBenchmark b
		return

	@charts = -> charts.toArray()

	@flipChart = (id) -> $("##{id}").shape('flip over'); return

	@render = (chart, $scope) ->
		$timeout =>
			height = Math.round($(window).height() * .67)
			sc = renderScore(chart, @perClass, height)
			pc = renderPercentiles(chart, @perClass, sc.chartHeight, sc.chartWidth)
			$scope.$on '$destroy', -> sc.destroy(); pc.destroy(); return
			return
		, 0, false
		return

	@removeFile = (file) -> 
		delete @uploaded[file.id]
		@resetCharts()
		return

	@loadFiles = (input) ->
		for file in input.files
			id = jmhc.UploadFile.id file.name, file.lastModifiedDate.getTime()
			if @uploaded[id]?
				alert "File '#{file.name}' has already been added. Ignoring..."
			else
				reader = new FileReader
				reader.readAsText file
				reader.onload = do (@uploaded, id, file, reader) -> -> 
					$scope.$apply ->
						try
							jmhBencharks = JSON.parse reader.result
						catch
							alert "File \"#{file.name}\" does not contain valid JSON. Ignoring..."
							return
						uploadFile = new jmhc.UploadFile id, file.name, file.lastModifiedDate.getTime()
						for jmh in jmhBencharks
							benchmark = new jmhc.Benchmark jmh, file.name, file.lastModifiedDate.getTime()
							charts.addBenchmark benchmark
							uploadFile.benchmarks.push benchmark
						@uploaded[id] = uploadFile
						return # $apply
					return # onload
		$(input).val("")
		return # loadFile

	return # controller

jmhModes =
	thrpt: "Throughput"
	avgt: "Average time"
	sample: "Sampling time"
	ss: "Single invocation time"

sharedChartOptions = (custom = {}) ->
	opt = $.extend true,
		credits: enabled: false
		exporting: enabled: true
		chart:
			style: fontFamily: "Signika, serif"
			#borderWidth: 1
			#borderColor: 'silver'
		plotOptions:
			series: 
				groupPadding: 0
				stickyTracking: false
				marker: enabled: false
		tooltip:
			formatter: ->
				tooltip = "<b>#{@series.name}</b>"
				tooltip += "<br/>Score: #{@point.y} #{@point.unit}"
				tooltip += "<br/>File: #{@point.filename}"
				for _, info of @point.info
					tooltip += "<br/>#{info.text}: #{info.value}"
				tooltip
	, custom
	opt

renderScore = (chart, perClass, height) ->
	any = chart.benchmarks[0]
	options = sharedChartOptions
		title: text: "#{jmhModes[chart.mode]} scores (#{chart.unit})"
		subtitle: text: if perClass then any.namespace else null
		chart:
			type: 'column'
			zoomType: 'xy'
			renderTo: "#{chart.id}_scores"
			height: height
		xAxis:
			labels: enabled: false
			categories: [jmhModes[chart.mode]]
		yAxis:
			title: text: "#{chart.unit}"
			min: 0
		legend: layout: 'vertical'
		series: do ->
			series = []
			for bench in chart.benchmarks
				series.push
					name: (if perClass then "" else "#{bench.namespace}.") + bench.name
					data: [
						y: bench.primary.score
						drilldown: if bench.secondaries.length then "#{bench.namespace}.#{bench.name}" else null
						info: bench.info
						unit: bench.unit
						filename: bench.filename
					]
				series.push 
					type: 'errorbar'
					enableMouseTracking: false
					data: [bench.primary.confidence]
			series
		drilldown:
			series: for bench in chart.benchmarks when bench.secondaries.length
				id: "#{bench.namespace}.#{bench.name}"
				name: (if perClass then "" else "#{bench.namespace}.") + bench.name
				enableMouseTracking: false
				data: for secondary in bench.secondaries
					name: secondary.name
					y: secondary.score
					dataLabels:
						enabled: true
						verticalAlign: 'bottom'
						formatter: -> @point.name
	new Highcharts.Chart options

renderPercentiles = (chart, perClass, height, width) ->
	any = chart.benchmarks[0]
	options = sharedChartOptions
		title: text: "#{jmhModes[chart.mode]} percentiles (#{chart.unit})"
		subtitle: text: if perClass then any.namespace else null
		chart:
			zoomType: 'xy'
			renderTo: "#{chart.id}_percentiles"
			type: 'spline'
			height: height
			width: width
		xAxis:
			categories: (p for p of any.primary.percentiles)
		yAxis:
			title: text: "#{chart.unit}"
			min: 0
		legend: layout: 'vertical'
		series: for bench in chart.benchmarks
			name: (if perClass then "" else "#{bench.namespace}.") + bench.name
			data: for _, p of bench.primary.percentiles
				y: p
				info: bench.info
				unit: bench.unit
				filename: bench.filename

	new Highcharts.Chart options
