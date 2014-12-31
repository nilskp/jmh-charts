(function() {
  var Chart, Metric, safe,
    __slice = [].slice;

  if (self.jmhc == null) {
    self.jmhc = {};
  }

  safe = function(id) {
    return id.replace(/[:\.\/\[\]]/g, "_");
  };

  jmhc.Charts = (function() {
    function Charts(perClass) {
      var charts;
      charts = {};
      this.addBenchmark = function(benchmark) {
        var chart, id;
        id = Chart.id(perClass, benchmark.mode, benchmark.unit, benchmark.namespace);
        chart = charts[id] || (charts[id] = new Chart(id, benchmark.mode, benchmark.unit));
        return chart.benchmarks.push(benchmark);
      };
      this.toArray = function() {
        var chart, _, _results;
        _results = [];
        for (_ in charts) {
          chart = charts[_];
          _results.push(chart);
        }
        return _results;
      };
    }

    return Charts;

  })();

  Chart = (function() {
    Chart.id = function(perClass, mode, unit, namespace) {
      return safe((perClass ? "" + namespace + "_" : "") + ("" + mode + "_" + unit));
    };

    function Chart(id, mode, unit) {
      this.id = id;
      this.mode = mode;
      this.unit = unit;
      this.benchmarks = [];
    }

    return Chart;

  })();

  Metric = (function() {
    function Metric(name, namespace, jmhMetric) {
      this.name = name;
      this.namespace = namespace;
      this.score = jmhMetric.score;
      this.error = jmhMetric.scoreError;
      this.confidence = jmhMetric.scoreConfidence;
      this.percentiles = jmhMetric.scorePercentiles;
    }

    return Metric;

  })();

  jmhc.Benchmark = (function() {
    function Benchmark(jmh, filename, filetime) {
      var cls, name, packages, parms, value, _ref;
      this.filetime = filetime;
      this.filename = filename.substring(0, filename.lastIndexOf('.'));
      _ref = jmh.benchmark.split(".").reverse(), this.name = _ref[0], cls = _ref[1], packages = 3 <= _ref.length ? __slice.call(_ref, 2) : [];
      if (jmh.params != null) {
        parms = (function() {
          var _ref1, _results;
          _ref1 = jmh.params;
          _results = [];
          for (name in _ref1) {
            value = _ref1[name];
            _results.push("" + name + "=" + value);
          }
          return _results;
        })();
        this.name = "" + this.name + "(" + (parms.join(", ")) + ")";
      }
      this.namespace = packages.length ? packages.reverse().map(function(p) {
        return p.substring(0, 1);
      }).join(".") + ("." + cls) : cls;
      this.mode = jmh.mode;
      this.unit = jmh.primaryMetric.scoreUnit;
      this.primary = new Metric(this.name, this.namespace, jmh.primaryMetric);
      this.secondaries = (function() {
        var jmhMetric, namespace, _ref1, _results;
        namespace = "" + this.namespace + "." + this.name;
        _ref1 = jmh.secondaryMetrics;
        _results = [];
        for (name in _ref1) {
          jmhMetric = _ref1[name];
          if (jmhMetric.scoreUnit === this.unit) {
            _results.push(new Metric(name, namespace, jmhMetric));
          }
        }
        return _results;
      })();
    }

    return Benchmark;

  })();

  jmhc.UploadFile = (function() {
    UploadFile.id = function(name, timestamp) {
      return safe("" + timestamp + "_" + name);
    };

    function UploadFile(id, name, timestamp) {
      this.id = id;
      this.name = name;
      this.timestamp = timestamp;
      this.benchmarks = [];
    }

    return UploadFile;

  })();

}).call(this);
