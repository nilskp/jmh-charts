angular.module('App', ['ui.jq', 'ngCookies']).controller 'AppCtrl', ($scope, $timeout, $cookieStore) ->

	@config = $cookieStore.get('config') || {perClass: true, showConfidence: false}
	$scope.watchedConfig = @config
	$scope.$watch 'watchedConfig', (newConfig) ->
		$cookieStore.put('config', newConfig)
	, true

	@uploaded = {}
	charts = new jmhc.Charts(@config.perClass)

	@resetCharts = ->
		charts = new jmhc.Charts(@config.perClass)
		for _, file of @uploaded
			for b in file.benchmarks then charts.addBenchmark b
		return

	@charts = -> charts.toArray()

	@showChart = (sideId) ->
		sideSelector = ".side:not(.active):has(##{sideId})"
		$side = $(sideSelector)
		$side.closest('.shape').shape('set next side', sideSelector).shape('flip over')
		return

	@render = (chart, $scope) ->
		$timeout =>
			height = Math.round($(window).height() * .67)
			sc = renderScore(chart, @config, height)
			pc = renderPercentiles(chart, @config, sc.chartHeight, sc.chartWidth)
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
	formatNum = (n) ->
		switch
			when n > 1 then n.abbr(1)
			when n < 0.000000001 then n.abbr(12)
			when n < 0.000001 then n.abbr(9)
			else n.abbr(6)
	opt = $.extend true,
		credits: enabled: false
		exporting: enabled: true
		colors: [
			'#4572A7', '#AA4643', '#89A54E', '#80699B', '#3D96AE', '#DB843D', '#92A8CD', '#A47D7C', '#B5CA92',
			'#7cb5ec', '#434348', '#90ed7d', '#f7a35c', '#8085e9', '#f15c80', '#e4d354', '#8085e8', '#8d4653', '#91e8e1',
			'#2f7ed8', '#0d233a', '#8bbc21', '#910000', '#1aadce', '#492970', '#f28f43', '#77a1e5', '#c42525', '#a6c96a'
		]
		chart:
			style: fontFamily: "Signika, serif"
		plotOptions:
			series: 
				groupPadding: 0
				stickyTracking: false
				marker: enabled: false
		tooltip:
			formatter: ->
				tooltip = "<b>#{@point.name || @series.name}</b>"
				tooltip += "<br/>Score: #{formatNum @point.y} #{@point.unit}"
				if @point.filename?
					tooltip += "<br/>File: #{@point.filename}"
				for _, info of @point.info
					tooltip += "<br/>#{info.text}: #{info.value}"
				tooltip
	, custom
	opt

renderScore = (chart, config, height) ->
	perClass = config.perClass
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
						name: (if perClass then "" else "#{bench.namespace}.") + bench.name
						y: bench.primary.score
						drilldown: if bench.secondaries.length then "#{bench.namespace}.#{bench.name}" else null
						info: bench.info
						unit: bench.unit
						filename: bench.filename
					]
				if config.showConfidence
					series.push 
						type: 'errorbar'
						enableMouseTracking: false
						data: [bench.primary.confidence]
			series
		drilldown:
			series: for bench in chart.benchmarks when bench.secondaries.length
				id: "#{bench.namespace}.#{bench.name}"
				name: (if perClass then "" else "#{bench.namespace}.") + bench.name
				data: for secondary in bench.secondaries
					name: secondary.name
					y: secondary.score
					unit: bench.unit
					dataLabels:
						enabled: true
						formatter: -> @point.name
	new Highcharts.Chart options

# Abandoned issue #3:
#renderBreakdown = (chart, perClass, height, width) ->
#	any = chart.benchmarks[0]
#	options = sharedChartOptions
#		title: text: "#{jmhModes[chart.mode]} score breakdown (#{chart.unit})"
#		subtitle: text: if perClass then any.namespace else null
#		chart:
#			type: 'column'
#			zoomType: 'xy'
#			renderTo: "#{chart.id}_breakdown"
#			height: height
#			width: width
#		xAxis:
#			labels: enabled: false
#			#categories: (bench.name for bench in chart.benchmarks when bench.secondaries.length)
#		yAxis:
#			title: text: "#{chart.unit}"
#			min: 0
#		legend: layout: 'vertical'
#		series: do ->
#			series = []
#			for bench in chart.benchmarks when bench.secondaries.length
#				series.push
#					name: (if perClass then "" else "#{bench.namespace}.") + bench.name
#					data: for secondary in bench.secondaries
#						name: secondary.name
#						y: secondary.score
#						info: bench.info
#						unit: bench.unit
#						filename: bench.filename
#				series.push 
#					type: 'errorbar'
#					enableMouseTracking: false
#					data: (secondary.confidence for secondary in bench.secondaries)
#			series
#	new Highcharts.Chart options

renderPercentiles = (chart, config, height, width) ->
	perClass = config.perClass
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
			categories: (name for name of any.primary.percentiles)
		yAxis:
			title: text: "#{chart.unit}"
			min: 0
		legend: layout: 'vertical'
		series: for bench in chart.benchmarks
			name: (if perClass then "" else "#{bench.namespace}.") + bench.name
			data: for name, p of bench.primary.percentiles
				y: p
				info: bench.info
				unit: bench.unit
				filename: bench.filename

	new Highcharts.Chart options
