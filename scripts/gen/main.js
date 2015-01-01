(function() {
  var jmhModes, renderPercentiles, renderScore, sharedChartOptions;

  angular.module('App', ['ui.jq']).controller('AppCtrl', function($scope, $timeout) {
    var charts;
    this.perClass = true;
    this.uploaded = {};
    charts = new jmhc.Charts(this.perClass);
    this.resetCharts = function() {
      var b, file, _, _i, _len, _ref, _ref1;
      charts = new jmhc.Charts(this.perClass);
      _ref = this.uploaded;
      for (_ in _ref) {
        file = _ref[_];
        _ref1 = file.benchmarks;
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          b = _ref1[_i];
          charts.addBenchmark(b);
        }
      }
    };
    this.charts = function() {
      return charts.toArray();
    };
    this.flipChart = function(id) {
      $("#" + id).shape('flip over');
    };
    this.render = function(chart, $scope) {
      $timeout((function(_this) {
        return function() {
          var height, pc, sc;
          height = Math.round($(window).height() * .67);
          sc = renderScore(chart, _this.perClass, height);
          pc = renderPercentiles(chart, _this.perClass, sc.chartHeight, sc.chartWidth);
          $scope.$on('$destroy', function() {
            sc.destroy();
            pc.destroy();
          });
        };
      })(this), 0, false);
    };
    this.removeFile = function(file) {
      delete this.uploaded[file.id];
      this.resetCharts();
    };
    this.loadFiles = function(input) {
      var file, id, reader, _i, _len, _ref;
      _ref = input.files;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        file = _ref[_i];
        id = jmhc.UploadFile.id(file.name, file.lastModifiedDate.getTime());
        if (this.uploaded[id] != null) {
          alert("File '" + file.name + "' has already been added. Ignoring...");
        } else {
          reader = new FileReader;
          reader.readAsText(file);
          reader.onload = (function(uploaded, id, file, reader) {
            this.uploaded = uploaded;
            return function() {
              $scope.$apply(function() {
                var benchmark, jmh, jmhBencharks, uploadFile, _j, _len1;
                try {
                  jmhBencharks = JSON.parse(reader.result);
                } catch (_error) {
                  alert("File \"" + file.name + "\" does not contain valid JSON. Ignoring...");
                  return;
                }
                uploadFile = new jmhc.UploadFile(id, file.name, file.lastModifiedDate.getTime());
                for (_j = 0, _len1 = jmhBencharks.length; _j < _len1; _j++) {
                  jmh = jmhBencharks[_j];
                  benchmark = new jmhc.Benchmark(jmh, file.name, file.lastModifiedDate.getTime());
                  charts.addBenchmark(benchmark);
                  uploadFile.benchmarks.push(benchmark);
                }
                this.uploaded[id] = uploadFile;
              });
            };
          })(this.uploaded, id, file, reader);
        }
      }
      $(input).val("");
    };
  });

  jmhModes = {
    thrpt: "Throughput",
    avgt: "Average time",
    sample: "Sampling time",
    ss: "Single invocation time"
  };

  sharedChartOptions = function(custom) {
    var opt;
    if (custom == null) {
      custom = {};
    }
    opt = $.extend(true, {
      credits: {
        enabled: false
      },
      exporting: {
        enabled: true
      },
      chart: {
        style: {
          fontFamily: "Signika, serif"
        }
      },
      plotOptions: {
        series: {
          groupPadding: 0,
          stickyTracking: false,
          marker: {
            enabled: false
          }
        }
      },
      tooltip: {
        formatter: function() {
          var info, tooltip, _, _ref;
          tooltip = "<b>" + this.series.name + "</b>";
          tooltip += "<br/>Score: " + this.point.y + " " + this.point.unit;
          tooltip += "<br/>File: " + this.point.filename;
          _ref = this.point.info;
          for (_ in _ref) {
            info = _ref[_];
            tooltip += "<br/>" + info.text + ": " + info.value;
          }
          return tooltip;
        }
      }
    }, custom);
    return opt;
  };

  renderScore = function(chart, perClass, height) {
    var any, bench, options, secondary;
    any = chart.benchmarks[0];
    options = sharedChartOptions({
      title: {
        text: "" + jmhModes[chart.mode] + " scores (" + chart.unit + ")"
      },
      subtitle: {
        text: perClass ? any.namespace : null
      },
      chart: {
        type: 'column',
        zoomType: 'xy',
        renderTo: "" + chart.id + "_scores",
        height: height
      },
      xAxis: {
        labels: {
          enabled: false
        },
        categories: [jmhModes[chart.mode]]
      },
      yAxis: {
        title: {
          text: "" + chart.unit
        },
        min: 0
      },
      legend: {
        layout: 'vertical'
      },
      series: (function() {
        var bench, series, _i, _len, _ref;
        series = [];
        _ref = chart.benchmarks;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          bench = _ref[_i];
          series.push({
            name: (perClass ? "" : "" + bench.namespace + ".") + bench.name,
            data: [
              {
                y: bench.primary.score,
                drilldown: bench.secondaries.length ? "" + bench.namespace + "." + bench.name : null,
                info: bench.info,
                unit: bench.unit,
                filename: bench.filename
              }
            ]
          });
          series.push({
            type: 'errorbar',
            enableMouseTracking: false,
            data: [bench.primary.confidence]
          });
        }
        return series;
      })(),
      drilldown: {
        series: (function() {
          var _i, _len, _ref, _results;
          _ref = chart.benchmarks;
          _results = [];
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            bench = _ref[_i];
            if (bench.secondaries.length) {
              _results.push({
                id: "" + bench.namespace + "." + bench.name,
                name: (perClass ? "" : "" + bench.namespace + ".") + bench.name,
                enableMouseTracking: false,
                data: (function() {
                  var _j, _len1, _ref1, _results1;
                  _ref1 = bench.secondaries;
                  _results1 = [];
                  for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
                    secondary = _ref1[_j];
                    _results1.push({
                      name: secondary.name,
                      y: secondary.score,
                      dataLabels: {
                        enabled: true,
                        verticalAlign: 'bottom',
                        formatter: function() {
                          return this.point.name;
                        }
                      }
                    });
                  }
                  return _results1;
                })()
              });
            }
          }
          return _results;
        })()
      }
    });
    return new Highcharts.Chart(options);
  };

  renderPercentiles = function(chart, perClass, height, width) {
    var any, bench, options, p, _;
    any = chart.benchmarks[0];
    options = sharedChartOptions({
      title: {
        text: "" + jmhModes[chart.mode] + " percentiles (" + chart.unit + ")"
      },
      subtitle: {
        text: perClass ? any.namespace : null
      },
      chart: {
        zoomType: 'xy',
        renderTo: "" + chart.id + "_percentiles",
        type: 'spline',
        height: height,
        width: width
      },
      xAxis: {
        categories: (function() {
          var _results;
          _results = [];
          for (p in any.primary.percentiles) {
            _results.push(p);
          }
          return _results;
        })()
      },
      yAxis: {
        title: {
          text: "" + chart.unit
        },
        min: 0
      },
      legend: {
        layout: 'vertical'
      },
      series: (function() {
        var _i, _len, _ref, _results;
        _ref = chart.benchmarks;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          bench = _ref[_i];
          _results.push({
            name: (perClass ? "" : "" + bench.namespace + ".") + bench.name,
            data: (function() {
              var _ref1, _results1;
              _ref1 = bench.primary.percentiles;
              _results1 = [];
              for (_ in _ref1) {
                p = _ref1[_];
                _results1.push({
                  y: p,
                  info: bench.info,
                  unit: bench.unit,
                  filename: bench.filename
                });
              }
              return _results1;
            })()
          });
        }
        return _results;
      })()
    });
    return new Highcharts.Chart(options);
  };

}).call(this);
