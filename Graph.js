var gcf;  // global variable, current figure id, eg. "fig1"
var gca;  // global variable, current axis

function figure(figNum) {
  // figNum is an integer 1, 2, ,...
  // looks for the corresponding canvas id is "fig1", "fig2", ...
  var id = "fig" + figNum;
  var cnv = document.getElementById(id);
  
  if(!cnv) {
    cnv = document.createElement('canvas');
    cnv.id = id;
    cnv.width = 400;
    cnv.height = 300;
    document.body.appendChild(cnv);
    cnv.axis = new Axis(cnv);
  } else {
    // found existing fig, add an axis if it doesn't already exist
    if(!cnv.axis)cnv.axis = new Axis(cnv);
  }
  gcf = cnv.id;
  gca = cnv.axis;
}

function plot() {
  if(!gcf)figure(1);
  let tr = new Trace(...arguments);
  gca.traces.push(tr);
  gca.draw();
}

function clf() {
  gca.traces = [];
  gca.draw();
}

function xlabel(str) {
  gca.xlabel = str;
  gca.draw();
}

function ylabel(str) {
  gca.ylabel = str;
  gca.draw();
}

function xlim() {
  xticks(...arguments);
}

function ylim() {
  yticks(...arguments);
}

function xticks(xmin, xmax, xstep) {
  if(!xstep) xstep = (xmax - xmin) / 5;
  if (arguments[0] === 'auto') {
    gca.xtickMode = 'auto';
  } else {
    gca.xtickMode = 'manual'
    gca.xticks = {min:xmin, max:xmax, step:xstep};
  }
  gca.draw();
}

function yticks(ymin, ymax, ystep) {
  if(!ystep) ystep = (ymax - ymin) / 5;
  if (arguments[0] === 'auto') {
    gca.ytickMode = 'auto';
  } else {
    gca.ytickMode = 'manual'
    gca.yticks = {min:ymin, max:ymax, step:ystep};
  }
  gca.draw();
}

//===========================================================
// utilities: arange, assert, f2t, hist, randi, randf, randn
//===========================================================

function arange() {
  // return an array of evenly spaced values
  // usage: arange([start,] stop, [step])
  // values are generated in the half open interval [start, stop)

  let args = arguments;
  let nargs = args.length;

  if (nargs === 1) {
    start = 0;
    stop = args[0];
    step = 1;
  } else if (nargs === 2) {
    start = args[0];
    stop = args[1];
    step = 1;
  } else if (nargs === 3) {
    start = args[0];
    stop = args[1];
    step = args[2];
  } else {
    throw new Error("arange: invalid arguments");
  }

  let a = [];
  for (let i = start; i < stop; i += step) a.push(i);
  return a;
}

function assert(condition, message) {
  if (!condition) {
    message = message || "Assertion failed";
    throw new Error(message);
  }
}

function f2t(x, places) {
  // float to text conversion
  if (arguments.length === 1) places = 2;
  let power10 = pow(10, places);
  return '' + Math.round(x * power10) / power10;
}

function hist(data, bins) {
  // data is an array of data points
  // bins is an array of lower bin edges, equally spaced
  let underflow = 0;
  let overflow = 0;
  let counts = bins.map(() => 0); // array of zeros, same size as bins
  let bmin = bins[0];
  let bwidth = bins[1] - bins[0];
  let bmax = bins[0] + bins.length * bwidth;
  
  for (let i=0; i<data.length; i++) {
    if (data[i] < bmin) {
      underflow++;
    } else if (data[i] > bmax) {
      overflow++;
    } else {
      let idx = Math.floor((data[i] - bmin) / bwidth);
      counts[idx]++;
    }
  }
  return {counts, bins, underflow, overflow};
}

function randi(a, b) { 
  return Math.floor(Math.random()*(b-a)+a); 
}

function randf(a, b) { 
  return Math.random()*(b-a)+a; 
}


function randn() {
  var c, u, v, r;
  if(randn.cached) {
      let val = randn.cached;
      randn.cached = false;
      return val;
  } else {
    do {
        u = 2*Math.random()-1;
        v = 2*Math.random()-1;
        r = u*u + v*v;
    } while (r===0 || r > 1)
  c = Math.sqrt(-2*Math.log(r)/r);
  randn.cached = v*c;
  return u*c;
  }
}

//==================================================================
// Axis Class
// 
// an axis is a graph that can display multiple traces
//==================================================================

  
class Axis {
  constructor(cnv) {
    this.cnv = cnv;
    this.traces = [];
    this.xlabel = 'xlabel';
    this.xpad = {
      left: 40,
      right: 15
    }
    this.xtickMode = 'auto';
    this.xticks = {
      min: 0,
      max: 1,
      step: 0.2
    };
    this.ylabel = 'ylabel';
    this.ypad = {
      bottom: 40,
      top: 10
    };
    this.ytickMode = 'auto';
    this.yticks = {
      min: 0,
      max: 1,
      step: 0.2
    };
  }

  calcTicks(vmin, vmax, ntry) {
    // ntry is number of ticks to try
    let tickStep = (vmax - vmin) / (ntry - 1);
    let mag = Math.pow(10, Math.floor(Math.log10(tickStep)));
    let residual = tickStep / mag;
    if (residual > 5) {
      tickStep = 10 * mag;
    } else if (residual > 2) {
      tickStep = 5 * mag;
    } else if (residual > 1) {
      tickStep = 2 * mag;
    } else {
      tickStep = mag;
    }
    let tickMin = tickStep * Math.floor(vmin / tickStep);
    let tickMax = tickStep * Math.ceil(vmax / tickStep);
    let nticks = Math.floor((tickMax - tickMin) / tickStep) + 1;
    return {
      min: tickMin,
      max: tickMax,
      step: tickStep
    };
  }

  draw() {

    let cnv = this.cnv;
    assert(cnv.id, "Axis.draw, canvas not found" + cnv);
    let ctx = cnv.getContext('2d');

    // useful dimensions
    let W = cnv.width;
    let H = cnv.height;
    let gWidth = W - this.xpad.left - this.xpad.right;
    let gHeight = H - this.ypad.top - this.ypad.bottom;

    // colors
    let styles = {
      r: 'red',
      g: 'green',
      b: 'blue',
      c: 'cyan',
      m: 'magenta',
      k: 'black',
    };

    // draw background
    ctx.fillStyle = "#FFE";
    ctx.fillRect(0,0, W, H);

    // draw guidelines and values
    ctx.fillStyle = "#777";
    ctx.strokeStyle = "#777";
    ctx.font = "11px Arial";

    // get axes limits and ticks based on trace info
    let ntraces = this.traces.length;
    if (ntraces > 0) {
      let xrange = {
        min: Infinity,
        max: -Infinity
      };
      let yrange = {
        min: Infinity,
        max: -Infinity
      };
      for (let trace of this.traces) {
        xrange.min = Math.min(xrange.min, trace.xrange.min);
        xrange.max = Math.max(xrange.max, trace.xrange.max);
        yrange.min = Math.min(yrange.min, trace.yrange.min);
        yrange.max = Math.max(yrange.max, trace.yrange.max);
      }
      if(this.xtickMode === 'auto') {
        this.xticks = this.calcTicks(xrange.min, xrange.max, 9);
      }
      if(this.ytickMode === 'auto') {
        this.yticks = this.calcTicks(yrange.min, yrange.max, 9);
      }
    }
    
    // tranformations from data coordinates to screen coordinates
    let tx = (x) => this.xpad.left + (x - this.xticks.min) / (this.xticks.max - this.xticks.min) * gWidth;
    let ty = (y) => H - this.ypad.bottom - (y - this.yticks.min) / (this.yticks.max - this.yticks.min) * gHeight;

    ctx.beginPath();
    ctx.textAlign = "center"
    
    // xticks
    let eps = 1e-6;
    var xdat = this.xticks.min;
    do {
      let xpos = tx(xdat);
      ctx.moveTo(xpos, this.ypad.top);
      ctx.lineTo(xpos, this.ypad.top + gHeight);
      ctx.fillText(f2t(xdat), xpos, this.ypad.top + gHeight + 15);
      xdat += this.xticks.step;
    } while (xdat <= this.xticks.max+eps)
    
    // xlabel
    ctx.fillText(this.xlabel, this.xpad.left + gWidth / 2, H - 10);

    // yticks
    ctx.textAlign = "end";
    var ydat = this.yticks.min
    do {
      let ypos = ty(ydat);
      ctx.moveTo(this.xpad.left, ypos);
      ctx.lineTo(W - this.xpad.right, ypos);
      ctx.fillText(f2t(ydat), this.xpad.left - 5, ypos);
      ydat += this.yticks.step;
    } while (ydat <= this.yticks.max+eps)
    
    // ylabel
    ctx.save();
    ctx.translate(10, H - this.ypad.bottom - gHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText(this.ylabel, 0, 0);
    ctx.restore();
    
    ctx.stroke();

    // draw data
    if (this.traces.length === 0) return;
    

    for (let tr of this.traces) {
      ctx.strokeStyle = styles[tr.style[0]];
      ctx.fillStyle = ctx.strokeStyle;
      // check for line style, styles have 2-3 characters, 1st char is a color
      // examples "b-", "b.-", "bo-", etc. (like matlab)
      // NEW: 'b|' draws vertical bar graph (useful for histograms)
      let nchar = tr.style.length;
      let drawBars = tr.style[nchar-1] === '|' || tr.style[nchar-2] === '|'
      let drawLine = tr.style[nchar-1] === '-' || tr.style[nchar-2] === '-'
      
      // TODO: add support for different point styles
      // for now, draw all points as small squares
      let drawPts = tr.style[1] !== '-' && tr.style[1] !== '|'; 
      
      // TODO: add support for different point styles
      // for now, draw all points as small squares
      if(drawLine) {
        ctx.beginPath();
        if (tr.xmode === 'auto') {
          ctx.moveTo(tx(0), ty(tr.ydat[0]));
          for (let i = 1; i < tr.ydat.length; i++) {
            ctx.lineTo(tx(i), ty(tr.ydat[i]));
          }
        } else {
          ctx.moveTo(tx(tr.xdat[0]), ty(tr.ydat[0]));
          for (let i = 1; i < tr.ydat.length; i++) {
            ctx.lineTo(tx(tr.xdat[i]), ty(tr.ydat[i]));
          }
        }
        ctx.stroke();
      }
      // bars (for histograms)
      // bars are draw with left edge aligned with lower bin edge
      if (drawBars) {
        let ymin = Math.max(0, this.yticks.min);
        let wbar = tx(tr.xdat[1]) - tx(tr.xdat[0]); // assume equally spaced
        ctx.beginPath();
        if (tr.xmode === 'auto') {
          let wbar = (tx(1)-tx(0)) - 1;
          for (let i = 0; i < tr.ydat.length; i++) {
            ctx.fillRect(tx(i), ty(tr.ydat[i]), wbar, ty(ymin)-ty(tr.ydat[i]));
          }
        } else {
          let wbar = (tx(tr.xdat[1]) - tx(tr.xdat[0])) - 1;
          ctx.moveTo(tx(tr.xdat[0]), ty(tr.ydat[0]));
          for (let i = 0; i < tr.ydat.length; i++) {
            ctx.fillRect(tx(tr.xdat[i]), ty(tr.ydat[i]), wbar, ty(ymin)-ty(tr.ydat[i]));
          }
        }
         ctx.stroke();
      }
      
      if (drawPts) {
        ctx.beginPath();
        if (tr.xmode === 'auto') {
          for (let i = 0; i < tr.ydat.length; i++) {
            ctx.fillRect(tx(i)-2, ty(tr.ydat[i])-2, 4, 4);
          }
        } else {
          ctx.moveTo(tx(tr.xdat[0]), ty(tr.ydat[0]));
          for (let i = 0; i < tr.ydat.length; i++) {
            ctx.fillRect(tx(tr.xdat[i])-2, ty(tr.ydat[i])-2, 4, 4);
          }
        }
         ctx.stroke();
      }
     
    }
  }
}

//==================================================================
// Trace Class
//
// a trace is a set of data points and associated style, label, etc
//==================================================================

class Trace {
  constructor() {
    this.label = 'none';
    this.style = 'b-'; //default plot style
    this.xmode = 'auto'; // in auto mode, xdat is implict 
    this.xdat = [];
    this.xrange = {
      min: null,
      max: null
    }; // [xmin, xmax]
    this.ydat = [];
    this.yrange = {
      min: null,
      max: null
    }; // [ymin, ymax]

    // constructor can optionally add data points
    // new Trace(x,y,[linespec])
    // new Trace(y, [linespec])
    // linespec is an optional string that sets the style
    // e.g. "b-", "g.", "go-"
    let nargs = arguments.length;
    if (nargs === 1) { // new Trace(y)
      this.add(arguments[0]);
    } else if (nargs === 2) {
      if (typeof arguments[1] === 'string') {
        this.add(arguments[0]);   // new Trace(y,'b-');
        this.style = arguments[1];
      } else {
        this.add(arguments[0], arguments[1]); // new Trace(x,y)
      }
    } else if (nargs === 3) {  // new Trace(x, y, 'b-');
      this.add(arguments[0], arguments[1]);
      this.style = arguments[2];
    }
  }

  add() {
    // add data to the trace
    //  possible usage:
    //   tr.addpts(ypt) - a single y value (xmode must be auto)
    //   tr.addpts(yarray) - array of y values (xmode must be auto)
    //   tr.addpts(xpt, ypt)
    //   tr.addpts(xarray, yarray)
    let args = arguments;
    let nargs = args.length;

    if (args.length === 1) {
      // called with one argument, 
      // either a single y value or an array of y values
      // can't add this if xmode is 'xy'
      assert(this.xmode === 'auto',
        'trace usage error: wrong mode');
      // if singleton, make it an array
      let ynew = Array.isArray(args[0]) ? args[0] : [args[0]];
      if (!this.yrange.min) this.yrange = {
        min: Infinity,
        max: -Infinity
      };
      for (let i = 0; i < ynew.length; i++) {
        this.ydat.push(ynew[i]);
        this.yrange.min = Math.min(this.yrange.min, ynew[i]);
        this.yrange.max = Math.max(this.yrange.max, ynew[i]);
      }
      // update xrange, implicit because we are in auto mode
      if (!this.xrange.min) {
        this.xrange = {
          min: 0,
          max: ynew.length - 1
        };
      } else {
        this.xrange.max += ynew.length;
      }
    } else if (args.length === 2) {
      // called with two arguments, either a single (x, y) point
      // or an array of xvalues and corresponding array of y values
      assert(this.ydat.length === 0 || this.xmode === 'xy',
        'trace.add usage error: cannot add xy data to auto mode data');
      let xnew = Array.isArray(args[0]) ? args[0] : [args[0]];
      let ynew = Array.isArray(args[1]) ? args[1] : [args[1]];
      assert(xnew.length === ynew.length,
        'trace.add usage error: x and y data length mismatch');
      this.xmode = 'xy';
      if (!this.xrange.min) this.xrange = {
        min: Infinity,
        max: -Infinity
      };
      for (let i = 0; i < xnew.length; i++) {
        this.xdat.push(xnew[i]);
        this.xrange.min = Math.min(this.xrange.min, xnew[i]);
        this.xrange.max = Math.max(this.xrange.max, xnew[i]);
        this.ydat.push(ynew[i]);
        this.yrange.min = Math.min(this.yrange.min, ynew[i]);
        this.yrange.max = Math.max(this.yrange.max, ynew[i]);
      }
    } else {
      throw new Error('trace.add: invalid arguments');
    }
  }
}
