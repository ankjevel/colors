/*jshint esnext:true*/
((d, wi) => {
  'use strict';

  var params = (() => {
    var searchString = wi.location.search.substring(1);
    if (!searchString) {
      return {};
    }
    return searchString
      .split('&')
      .reduce((object, part) => {
        var values = part.split('=');
        var key = decodeURIComponent(values[0]);
        var value = decodeURIComponent(values[1]);
        object[key] = value;
        return object;
      }, {});
  })();

  fetch(`${params.lang ? params.lang : 'sv'}.json`)
    .then(response => {
      return response.json();
    })
    .then(json => {
      var replaceTemplate = element => {
        var attributeToChage = value => {};

        var toChange = (() => {
          if (element.tagName === 'TEMPLATE') {
            attributeToChage = value => {
              var newElement = d.createElement('span');
              newElement.innerHTML = value;
              element.parentNode.replaceChild(newElement, element);
            };
            return element.innerHTML;
          }
          var attribute = element.getAttribute('template');
          var toChange = element.getAttribute(attribute);
          attributeToChage = value => {
            element.removeAttribute('template');
            element.setAttribute(attribute, value);
          };
          return `${toChange}`;
        })()
        .replace(/\}|\{/g, '')
        .split('.')
        .reduce((value, part, i) => {
          if (i === 0) {
            if (json.hasOwnProperty(part)) {
              return json[part];
            } else {
              return {};
            }
          }
          if (typeof value === 'object' &&
              value.hasOwnProperty(part)) {
            return value[part];
          } else {
            return '';
          }
        }, '');

        attributeToChage(toChange);
      };

      Array
        .from(d.querySelectorAll('template, [template]'))
        .forEach(replaceTemplate);
    });

  d.addEventListener('DOMContentLoaded', loaded => {

    var newImage = image => {
      e.selectors
        .elementsArray
        .forEach(element => {
          element.classList.add('loading');
        });

      e.chipKeys.elementsArray
        .concat(e.selectable.elementsArray)
        .forEach(element => {
          element.style.backgroundColor = 'rgba(255,255,255,.1)';
        });

      drawImage();

      var h = e.hidden.elements.h;
      var ctx = e.hidden.context;

      ctx.clearRect(0, 0, h.width, h.height);
      ctx.drawImage(image, 0, 0, image.width, image.height);

      var data = ctx.getImageData(0, 0, image.width, image.height);

      var worker = new Worker('worker.js');
      var max = e.form.elements.number.value | 0;

      worker.onmessage = event => {
        e.selectors
          .elementsArray
          .forEach(element => {
            element.classList.remove('loading');
          });
        e.selectable.originalColor = [];
        event
          .data
          .results
          .mostUsed
          .forEach((rgba, i) => {
            var color = `rgba(${rgba}`;

            e.chipKeys
              .elementsArray[i]
              .style
              .backgroundColor = color;

            e.selectable
              .elementsArray[i]
              .style
              .backgroundColor = color;

            e.selectable
              .originalColor.push(color);
          });
      };

      worker.postMessage({
        data: data.data,
        width: data.width,
        height: data.height,
        max: max === 0 ? 10 : max
      });
    };

    var drawImage = () => {
      var b = e.canvas.elements.block;
      var bw = b.clientWidth;
      var bh = b.clientHeight;
      var p = Math.min((bw / image.width), (bh / image.height));
      var w = Math.min(image.width * p, image.width);
      var h = Math.min(image.height * p, image.height);

      var x = (bw - w) / 2;
      var y = (bh - h) / 2;

      var c = e.canvas.elements.c;

      e.canvas.context.clearRect(0, 0, c.width, c.height);

      c.width = w;
      c.height = h;
      c.style.marginLeft = `${x}px`;
      c.style.marginTop = `${y}px`;

      e.canvas.context.drawImage(image, 0, 0, w, h);
    };

    var generateChips = elements => {

      var colorDest = d.querySelector('.block--color .colors');
      var paletteDest = d.querySelector('.block--palette .colors');

      colorDest.innerHTML = '';
      paletteDest.innerHTML = '';

      var chipKeys = [];
      var selectable = [];

      var element;
      for (var i = 0; i < elements; i++) {
        element = d.createElement('li');
        element.className = 'chip chip--key';

        chipKeys.push(element);
        colorDest.appendChild(element);

        element = d.createElement('li');
        element.className = 'chip chip--selectable';
        element.innerHTML = `<span>${i}</span>`;

        selectable.push(element);
        paletteDest.appendChild(element);
      }

      var active = selectable[0];
      active.classList.add('active');

      return [chipKeys, selectable, active];
    };

    var e = (() => {
      var canvas = d.getElementById('canvas');
      var context = canvas.getContext('2d');

      var block = d.getElementsByClassName('block--canvas')[0];

      var form = Array
        .from(d.querySelectorAll('.block--form input'))
        .concat(Array
                .from(d.querySelectorAll('.block--palette input')))
        .reduce((object, element, i) => {
          object[element.id] = element;
          return object;
        }, {});

      var selectors = {
        color: d.getElementsByClassName('block--color')[0],
        palette: d.getElementsByClassName('block--palette')[0],
      };

      if (!canvas || !block || !form || !context) {
        return null;
      }

      form.number.value = params.number ? params.number | 0 : 10;
      form.url.value = params.url ? params.url : 'colors.png';

      var [ // fuck you chrome
        chipKeys,
        selectable,
        active
      ] = generateChips(form.number.value | 0);

      var hidden = d.createElement('canvas');

      return {
        hidden: {
          context: hidden.getContext('2d'),
          elements: {
            h: hidden
          }
        },
        canvas: {
          context: context,
          elements: {
            block: block,
            c: canvas
          }
        },
        chipKeys: {
          elementsArray: chipKeys
        },
        selectors: {
          elements: selectors,
          elementsArray: Array.from(selectors)
        },
        selectable: {
          active: active,
          elementsArray: selectable,
          originalColors: []
        },
        form: {
          elements: form
        }
      };

    })();

    if (e === false) {
      return;
    }

    wi.onresize = drawImage;

    e.selectable
      .elementsArray
      .forEach(element => {
        element.onclick = event => {
          e.selectable.active.classList.remove('active');
          e.selectable.active = event.target ;
          e.selectable.active.classList.add('active');
        };
      });

    e.canvas.elements.c.onclick = event => {
      var x = event.pageX - event.currentTarget.offsetLeft;
      var y = event.pageY - event.currentTarget.offsetTop;
      var imgd = e.canvas.context.getImageData(x, y, 1, 1);
      var data = imgd.data;
      var rgb = `rgb(${data[0]},${data[1]},${data[2]})`;

      e.selectable.active.style.backgroundColor = rgb;
    };

    e.form.elements.reset.onclick = event => {
      event.preventDefault();

      e.selectable.elementsArray[0].click();

      e.selectable
        .elementsArray
        .forEach((element, i) => {
          element.style.backgroundColor = e.selectable.originalColor[i];
        });
    };

    e.canvas.elements.c.width = e.canvas.elements.block.clientWidth;
    e.canvas.elements.c.height = e.canvas.elements.block.clientHeight;

    var image = new Image();
    image.crossOrigin = 'anonymous'; // Allows CORS
    image.src = e.form.elements.url.value;
    image.onload = event => {
      newImage(image);
    };

  });

})(document, window);
