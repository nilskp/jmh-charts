angular.module('App', ['ui.jq']).controller 'AppCtrl', ($scope, $timeout) ->

	@perClass = false
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
			pc = renderPercentiles(chart, @perClass, height)
			$scope.$on '$destroy', -> sc.destroy(); pc.destroy(); return
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

modes =
	thrpt: "Throughput"
	avgt: "Average time"
	sample: "Sampling time"
	ss: "Single invocation time"

renderScore = (chart, perClass, height) ->
	any = chart.benchmarks[0]
	options =
		title: text: "#{modes[chart.mode]} scores (#{chart.unit})"
		subtitle: text: if perClass then any.namespace else null
		credits: enabled: false
		chart:
			zoomType: 'xy'
			renderTo: "#{chart.id}_scores"
			height: height
			style:
				fontFamily: "Signika, serif"
		xAxis:
			labels: enabled: false
			categories: [modes[chart.mode]]
		yAxis:
			title: text: "#{chart.unit}"
			min: 0
		plotOptions:
			series: groupPadding: 0
			bar:
				stickyTracking: false
				marker: enabled: false
		legend: layout: 'vertical'
		series: do ->
			series = []
			for bench in chart.benchmarks
				series.push
					type: 'column'
					name: (if perClass then "" else "#{bench.namespace}.") + "#{bench.name} (#{bench.filename})"
					data: [bench.primary.score]
				series.push 
					type: 'errorbar'
					data: [bench.primary.confidence]
			series
	new Highcharts.Chart options

renderPercentiles = (chart, perClass, height) ->
	any = chart.benchmarks[0]
	options =
		title: text: "#{modes[chart.mode]} percentiles (#{chart.unit})"
		subtitle: text: if perClass then any.namespace else null
		credits: enabled: false
		chart:
			zoomType: 'xy'
			renderTo: "#{chart.id}_percentiles"
			type: 'spline'
			height: height
			style:
				fontFamily: "Signika, serif"
		xAxis:
			categories: (p for p of any.primary.percentiles)
		yAxis:
			title: text: "#{chart.unit}"
			min: 0
		legend: layout: 'vertical'
		plotOptions:
			spline:
				stickyTracking: false
				marker: enabled: false
		series: for bench in chart.benchmarks
			name: (if perClass then "" else "#{bench.namespace}.") + "#{bench.name} (#{bench.filename})"
			data: for _, p of bench.primary.percentiles then p
	new Highcharts.Chart options
