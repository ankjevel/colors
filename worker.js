/*jshint esnext:true*/
var image = null;
var getTreshold = () => {
  var threshold = image.threshold || 0.1;
  threshold = Math.max(Math.min(threshold, 255), 0);
  if (threshold >= 0 && threshold <= 1) {
    return threshold;
  } else {
    return threshold / 255;
  }
};
var process = () => {
  var length = image.width * image.height;
  var threshold = getTreshold();
  var colors = {};
  var rgba;
  for (var i = 0; i < length; i += 4) {
    rgba = [
      image.data[i],
      image.data[i + 1],
      image.data[i + 2],
      image.data[i + 3] / 255
    ];
    if (rgba[3] <= threshold) {
      continue;
    }
    if (colors.hasOwnProperty(rgba)) {
      colors[rgba]++;
    } else {
      colors[rgba] = 1;
    }
  }

  var sorted = Object
    .keys(colors)
    .reduce((object, rgba) => {
      var n = colors[rgba];
      if (object.hasOwnProperty(n)) {
        object[n].push(rgba);
      } else {
        object.counts.push(n);
        object[n] = [rgba];
      }
      return object;
    }, {
      counts: []
    });

  var max = image.max | 0;
  var mostUsed = sorted
    .counts
    .sort((a, b) => {
      return b - a;
    })
    .slice(0, max)
    .map(n => {
      return sorted[n];
    })
    .reduce((used, array) => {
      if (max <= 0) {
        return used;
      }
      var newMax = Math.max(max - array.length, 0);
      var diff = max - newMax;
      max = newMax;
      return used.concat(array.slice(0, diff));
    }, []);

  postMessage({
    status: 'ok',
    results: {
      colors: colors,
      mostUsed: mostUsed
    }
  });
};

var onmessage = e => {
  image = e.data;
  process();
};
