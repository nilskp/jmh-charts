(function() {
  var jmhModes, renderPercentiles, renderScore, sharedChartOptions;

  angular.module('App', ['ui.jq', 'ngCookies']).controller('AppCtrl', function($scope, $timeout, $cookieStore) {
    var charts;
    this.config = $cookieStore.get('config') || {
      perClass: true,
      showConfidence: false
    };
    $scope.watchedConfig = this.config;
    $scope.$watch('watchedConfig', function(newConfig) {
      return $cookieStore.put('config', newConfig);
    }, true);
    this.uploaded = {};
    charts = new jmhc.Charts(this.config.perClass);
    this.resetCharts = function() {
      var b, file, _, _i, _len, _ref, _ref1;
      charts = new jmhc.Charts(this.config.perClass);
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
    this.showChart = function(sideId) {
      var $side, sideSelector;
      sideSelector = ".side:not(.active):has(#" + sideId + ")";
      $side = $(sideSelector);
      $side.closest('.shape').shape('set next side', sideSelector).shape('flip over');
    };
    this.render = function(chart, $scope) {
      $timeout((function(_this) {
        return function() {
          var height, pc, sc;
          height = Math.round($(window).height() * .67);
          sc = renderScore(chart, _this.config, height);
          pc = renderPercentiles(chart, _this.config, sc.chartHeight, sc.chartWidth);
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
    var formatNum, opt;
    if (custom == null) {
      custom = {};
    }
    formatNum = function(n) {
      switch (false) {
        case !(n > 1):
          return n.abbr(1);
        case !(n < 0.000000001):
          return n.abbr(12);
        case !(n < 0.000001):
          return n.abbr(9);
        default:
          return n.abbr(6);
      }
    };
    opt = $.extend(true, {
      credits: {
        enabled: false
      },
      exporting: {
        enabled: true
      },
      colors: ['#4572A7', '#AA4643', '#89A54E', '#80699B', '#3D96AE', '#DB843D', '#92A8CD', '#A47D7C', '#B5CA92', '#7cb5ec', '#434348', '#90ed7d', '#f7a35c', '#8085e9', '#f15c80', '#e4d354', '#8085e8', '#8d4653', '#91e8e1', '#2f7ed8', '#0d233a', '#8bbc21', '#910000', '#1aadce', '#492970', '#f28f43', '#77a1e5', '#c42525', '#a6c96a'],
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
          tooltip = "<b>" + (this.point.name || this.series.name) + "</b>";
          tooltip += "<br/>Score: " + (formatNum(this.point.y)) + " " + this.point.unit;
          if (this.point.filename != null) {
            tooltip += "<br/>File: " + this.point.filename;
          }
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

  renderScore = function(chart, config, height) {
    var any, bench, options, perClass, secondary;
    perClass = config.perClass;
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
        }
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
                name: (perClass ? "" : "" + bench.namespace + ".") + bench.name,
                y: bench.primary.score,
                drilldown: bench.secondaries.length ? "" + bench.namespace + "." + bench.name : null,
                info: bench.info,
                unit: bench.unit,
                filename: bench.filename
              }
            ]
          });
          if (config.showConfidence) {
            series.push({
              type: 'errorbar',
              enableMouseTracking: false,
              data: [bench.primary.confidence]
            });
          }
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
                data: (function() {
                  var _j, _len1, _ref1, _results1;
                  _ref1 = bench.secondaries;
                  _results1 = [];
                  for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
                    secondary = _ref1[_j];
                    _results1.push({
                      name: secondary.name,
                      y: secondary.score,
                      unit: bench.unit,
                      dataLabels: {
                        enabled: true,
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

  renderPercentiles = function(chart, config, height, width) {
    var any, bench, name, options, p, perClass;
    perClass = config.perClass;
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
          for (name in any.primary.percentiles) {
            _results.push(name);
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
              for (name in _ref1) {
                p = _ref1[name];
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
