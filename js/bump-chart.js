class BumpChart {
  constructor({ el, data, accessors }) {
    this.el = el;
    this.data = data;
    this.accessors = accessors;
    this.resize = this.resize.bind(this);
    this.movedSvg = this.movedSvg.bind(this);
    this.leftSvg = this.leftSvg.bind(this);
    this.enteredLink = this.enteredLink.bind(this);
    this.init();
  }

  init() {
    this.highlighted = [];

    this.margin = {
      top: 24,
      right: 40,
      bottom: 24,
      left: 40,
    };
    this.rowHeight = 16;
    this.height =
      this.data.ys.length * this.rowHeight +
      this.margin.top +
      this.margin.bottom;
    this.patchWidth = 20; // Patches are added to help give the label a white background

    this.x = d3.scalePoint().domain(this.data.xs);

    this.y = d3
      .scalePoint()
      .domain(this.data.ys)
      .range([this.margin.top, this.height - this.margin.bottom])
      .padding(0.5);

    this.diff = d3
      .scaleOrdinal()
      .domain([0, 1, 2])
      .range(["", "decrease", "increase"]);

    this.line = d3
      .line()
      .x((d) => this.x(this.accessors.x(d)))
      .y((d) => this.y(this.accessors.y(d)))
      .curve(d3.curveBumpX);

    this.container = d3.select(this.el).classed("bump-chart", true);
    this.svg = this.container
      .append("svg")
      .on("mousemove", this.movedSvg)
      .on("mouseleave", this.leftSvg);
    this.gTop = this.svg.append("g").attr("class", "axis axis--top");
    this.gBottom = this.svg.append("g").attr("class", "axis axis--bottom");
    this.gLeft = this.svg.append("g").attr("class", "axis axis--left");
    this.gRight = this.svg.append("g").attr("class", "axis axis--right");
    this.link = this.svg.append("g").attr("class", "links");
    this.patch = this.svg.append("g").attr("class", "patches");
    this.node = this.svg
      .append("g")
      .attr("class", "nodes")
      .call((g) => g.append("g").attr("class", "node__circles"))
      .call((g) => g.append("g").attr("class", "node__labels"));

    this.outerNodes = [];
    this.innerNodes = [];
    this.data.nodes.forEach((d) => {
      const x = this.accessors.x(d);
      if (
        x === this.data.xs[0] ||
        x === this.data.xs[this.data.xs.length - 1]
      ) {
        this.outerNodes.push(d);
      } else {
        this.innerNodes.push(d);
      }
    });

    this.resize();
    window.addEventListener("resize", this.resize);
  }

  resize() {
    this.width = this.el.clientWidth;

    this.isNarrow = this.width < 600;

    this.x.range([this.margin.left, this.width - this.margin.right]);

    this.delaunay = d3.Delaunay.from(
      this.data.nodes,
      (d) => this.x(this.accessors.x(d)),
      (d) => this.y(this.accessors.y(d))
    );

    this.svg.attr("viewBox", [0, 0, this.width, this.height]);

    this.render();
  }

  render() {
    this.renderXAxisTop();
    this.renderXAxisBottom();
    this.renderYAxisLeft();
    this.renderYAxisRight();
    this.renderLinks();
    this.renderPatches();
    this.renderNodes();
    this.highlight();
  }

  renderXAxisTop() {
    this.gTop
      .attr("transform", `translate(0,${this.margin.top - 4})`)
      .call(d3.axisTop(this.x))
      .call((g) => g.select(".domain").remove())
      .call((g) =>
        g
          .selectAll(".tick text")
          .style("display", (d, i) =>
            this.isNarrow && i % 2 === 1 ? "none" : null
          )
      );
  }

  renderXAxisBottom() {
    this.gBottom
      .attr("transform", `translate(0,${this.height - this.margin.bottom + 4})`)
      .call(d3.axisBottom(this.x))
      .call((g) => g.select(".domain").remove())
      .call((g) =>
        g
          .selectAll(".tick text")
          .style("display", (d, i) =>
            this.isNarrow && i % 2 === 1 ? "none" : null
          )
      );
  }

  renderYAxisLeft() {
    this.gLeft
      .attr("transform", `translate(${this.margin.left - this.patchWidth / 2})`)
      .call(d3.axisLeft(this.y))
      .call((g) => g.select(".domain").remove());
  }

  renderYAxisRight() {
    this.gRight
      .attr(
        "transform",
        `translate(${this.width - this.margin.right + this.patchWidth / 2})`
      )
      .call(d3.axisRight(this.y))
      .call((g) => g.select(".domain").remove());
  }

  renderLinks() {
    this.link
      .selectAll(".link")
      .data(this.data.links)
      .join((enter) =>
        enter
          .append("g")
          .attr("class", "link")
          .call((g) =>
            g
              .append("path")
              .attr("class", "link__path link__bg")
              .attr("stroke-width", 6)
          )
          .call((g) =>
            g
              .append("path")
              .attr("class", (d) => `link__path link__fg ${this.diff(d.diff)}`)
              .attr("stroke-width", 2)
          )
          .on("mouseenter", this.enteredLink)
      )
      .call((g) => g.select(".link__bg").attr("d", this.line))
      .call((g) => g.select(".link__fg").attr("d", this.line));
  }

  renderPatches() {
    this.patch
      .selectAll(".patch")
      .data(this.data.xs)
      .join((enter) =>
        enter
          .append("rect")
          .attr("class", "patch")
          .attr("y", this.margin.top)
          .attr("height", this.height - this.margin.bottom - this.margin.top)
      )
      .attr("x", (d) => this.x(d) - this.patchWidth / 2)
      .attr("width", (d, i) =>
        this.isNarrow && i > 0 && i < this.data.xs.length - 1
          ? 0
          : this.patchWidth
      );
  }

  renderNodes() {
    this.node
      .select(".node__circles")
      .selectAll(".node__circle")
      .data(this.isNarrow ? this.innerNodes : [])
      .join((enter) =>
        enter
          .append("circle")
          .attr("class", (d) => `node__circle ${this.diff(d.diff)}`)
          .attr("r", 4)
      )
      .attr("cx", (d) => this.x(this.accessors.x(d)))
      .attr("cy", (d) => this.y(this.accessors.y(d)));

    this.node
      .select(".node__labels")
      .selectAll(".node__label")
      .data(
        this.isNarrow
          ? this.outerNodes
          : [...this.outerNodes, ...this.innerNodes]
      )
      .join((enter) =>
        enter
          .append("text")
          .attr("class", (d) => `node__label ${this.diff(d.diff)}`)
          .attr("text-anchor", "middle")
          .attr("dy", "0.32em")
          .text(this.accessors.label)
      )
      .attr("x", (d) => this.x(this.accessors.x(d)))
      .attr("y", (d) => this.y(this.accessors.y(d)));
  }

  highlight() {
    this.highlightYAxisLeft();
    this.highlightYAxisRight();
    this.highlightLinks();
    this.highlightNodes();
  }

  highlightYAxisLeft() {
    const highlightedRanks = this.outerNodes
      .filter(
        (d) =>
          this.accessors.x(d) === this.data.xs[0] &&
          this.highlighted.includes(this.accessors.label(d))
      )
      .map(this.accessors.y);
    this.gLeft
      .selectAll(".tick")
      .attr("opacity", (d) =>
        highlightedRanks.length > 0 && !highlightedRanks.includes(d) ? 0 : 1
      );
  }

  highlightYAxisRight() {
    const highlightedRanks = this.outerNodes
      .filter(
        (d) =>
          this.accessors.x(d) === this.data.xs[this.data.xs.length - 1] &&
          this.highlighted.includes(this.accessors.label(d))
      )
      .map(this.accessors.y);
    this.gRight
      .selectAll(".tick")
      .attr("opacity", (d) =>
        highlightedRanks.length > 0 && !highlightedRanks.includes(d) ? 0 : 1
      );
  }

  highlightLinks() {
    this.link
      .selectChildren(".link")
      .attr("stroke-opacity", (d) =>
        this.highlighted.length > 0 &&
        !this.highlighted.includes(this.accessors.label(d))
          ? 0.1
          : 1
      );
  }

  highlightNodes() {
    this.node
      .select(".node__circles")
      .selectChildren(".node__circle")
      .attr("fill-opacity", (d) =>
        this.highlighted.length > 0 &&
        !this.highlighted.includes(this.accessors.label(d))
          ? 0.1
          : 1
      );

    this.node
      .select(".node__labels")
      .selectChildren(".node__label")
      .attr("fill-opacity", (d) =>
        this.highlighted.length > 0 &&
        !this.highlighted.includes(this.accessors.label(d))
          ? 0.1
          : 1
      );
  }

  movedSvg(event) {
    if (event.target.classList.contains("link__path")) return;
    if (this.freezed) return;
    const i = this.delaunay.find(...d3.pointer(event));
    const node = this.data.nodes[i];
    const label = this.accessors.label(node);
    if (this.highlighted.length === 1 && this.highlighted[0] === label) {
    } else {
      this.highlighted = [label];
      this.highlight();
    }
  }

  leftSvg(event) {
    if (this.freezed) return;
    this.highlighted = [];
    this.highlight();
  }

  enteredLink(event, d) {
    if (this.freezed) return;
    const label = this.accessors.label(d);
    if (this.highlighted.length === 1 && this.highlighted[0] === label) {
    } else {
      this.highlighted = [label];
      this.highlight();
    }
  }

  onHighlightedChange(highlighted) {
    this.highlighted = highlighted;
    this.freezed = highlighted.length > 0;
    this.highlight();
  }
}
