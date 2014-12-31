self.jmhc ?= {}

safe = (id) -> id.replace /[:\.\/\[\]]/g, "_"

class jmhc.Charts
	constructor: (perClass) ->
		charts = {}
		@addBenchmark = (benchmark) ->
			id = Chart.id(perClass, benchmark.mode, benchmark.unit, benchmark.namespace)
			chart = charts[id] || charts[id] = new Chart(id, benchmark.mode, benchmark.unit)
			chart.benchmarks.push benchmark
		@toArray = -> (chart for _, chart of charts)

class Chart
	@id: (perClass, mode, unit, namespace) -> safe((if perClass then "#{namespace}_" else "") + "#{mode}_#{unit}")
	constructor: (@id, @mode, @unit) ->
		@benchmarks = []

class Metric
	constructor: (@name, @namespace, jmhMetric) ->
		@score = jmhMetric.score
		@error = jmhMetric.scoreError
		@confidence = jmhMetric.scoreConfidence
		@percentiles = jmhMetric.scorePercentiles

class jmhc.Benchmark
	constructor: (jmh, filename, @filetime) ->
		@filename = filename.substring 0, filename.lastIndexOf '.'
		[@name, cls, packages...] = jmh.benchmark.split(".").reverse()
		if jmh.params?
			parms = ("#{name}=#{value}" for name, value of jmh.params)
			@name = "#{@name}(#{parms.join(", ")})"
		@namespace =
			if packages.length
				packages.reverse().map((p) -> p.substring(0, 1)).join(".") + ".#{cls}"
			else cls
		@mode = jmh.mode
		@unit = jmh.primaryMetric.scoreUnit
		@primary = new Metric(@name, @namespace, jmh.primaryMetric)
		@secondaries = do ->
			namespace = "#{@namespace}.#{@name}"
			# TODO: Perhaps consider unit normalization, in case of differences
			for name, jmhMetric of jmh.secondaryMetrics when jmhMetric.scoreUnit == @unit
				new Metric(name, namespace, jmhMetric)

class jmhc.UploadFile
	@id: (name, timestamp) -> safe("#{timestamp}_#{name}")
	constructor: (@id, @name, @timestamp) ->
		@benchmarks = []
