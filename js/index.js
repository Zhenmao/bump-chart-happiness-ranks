Promise.all([
  d3.csv("data/world-happiness-report.csv", (d) => ({
    name: d["Name"],
    year: +d["Year"],
    value: +d["Ladder Score"],
  })),
  d3.csv("data/iso-3166-country-codes.csv", (d) => ({
    name: d["English short name"],
    code: d["Alpha-2 code"],
  })),
]).then(([data, countryCodes]) => {
  const { years, names, codes, nodes, links } = processData(data, countryCodes);

  new MultipleSelect({
    selectEl: document.querySelector("#names-select"),
    options: d3
      .zip(names, codes)
      .map(([name, code]) => ({ value: code, text: `${name} (${code})` })),
    onChange: (selected) => {
      bumpChart.onHighlightedChange(selected);
    },
  });

  const bumpChart = new BumpChart({
    el: document.querySelector("#bump-chart"),
    data: {
      nodes,
      links,
      xs: years,
      ys: d3.range(1, names.length + 1),
    },
    accessors: {
      x: (d) => d.year,
      y: (d) => d.rank,
      label: (d) => d.code,
    },
  });
});
