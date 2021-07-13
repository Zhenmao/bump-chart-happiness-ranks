function processData(data, countryCodes) {
  const years = [...new Set(data.map((d) => d.year))].sort(d3.ascending);

  const namesSet = new Set(
    d3
      .groups(data, (d) => d.name)
      .filter(([_, entries]) => entries.length === years.length) // Only keep names with entries for all years
      .map(([name]) => name)
  );

  const countryCodesNamesFixMap = new Map([
    ["Netherlands", "Netherlands (the)"],
    [
      "United Kingdom",
      "United Kingdom of Great Britain and Northern Ireland (the)",
    ],
    ["Czech Republic", "Czechia"],
    ["United States", "United States of America (the)"],
    ["Taiwan Province of China", "Taiwan (Province of China)"],
    ["United Arab Emirates", "United Arab Emirates (the)"],
    ["Philippines", "Philippines (the)"],
    ["South Korea", "Korea (the Republic of)"],
    ["Moldova", "Moldova (the Republic of)"],
    ["Bolivia", "Bolivia (Plurinational State of)"],
    ["Dominican Republic", "Dominican Republic (the)"],
    ["North Cyprus", "Cyprus"],
    ["Russia", "Russian Federation (the)"],
    ["Hong Kong S.A.R. of China", "Hong Kong"],
    ["Vietnam", "Viet Nam"],
    ["Congo (Brazzaville)", "Congo (the)"],
    ["Ivory Coast", "Côte d'Ivoire"],
    ["Niger", "Niger (the)"],
    ["Venezuela", "Venezuela (Bolivarian Republic of)"],
    ["Iran", "Iran (Islamic Republic of)"],
    ["Palestinian Territories", "Palestine, State of"],
    ["Tanzania", "Tanzania, the United Republic of"],
  ]);

  const countryCodesMap = new Map(countryCodes.map((d) => [d.name, d.code]));

  const names = [...namesSet].sort(d3.ascending);

  const codes = names.map((name) => {
    if (countryCodesNamesFixMap.has(name)) {
      return countryCodesMap.get(countryCodesNamesFixMap.get(name));
    } else {
      return countryCodesMap.get(name);
    }
  });

  const countryCodesFixedMap = new Map(d3.zip(names, codes));

  const filteredData = data.filter((d) => namesSet.has(d.name));
  filteredData.forEach((d) => {
    d.code = countryCodesFixedMap.get(d.name);
  });

  const nodes = d3.merge(
    d3
      .flatRollup(
        filteredData,
        (v) => {
          v.sort((a, b) => d3.descending(a.value, b.value));
          v.forEach((d, i) => {
            d.rank = i + 1;
          });
          return v;
        },
        (d) => d.year
      )
      .map(([_, d]) => d)
  );

  const links = nodes
    .filter((curr) => {
      if (curr.year !== years[years.length - 1]) {
        return true;
      } else {
        curr.diff = 0;
        return false;
      }
    })
    .map((curr) => {
      const { rank, code, year } = curr;
      const next = nodes.find((d) => d.code === code && d.year === year + 1);
      const link = [curr, next];
      link.diff = !next
        ? false
        : rank === next.rank
        ? 0
        : rank < next.rank
        ? 1
        : 2;
      if (next) next.diff = link.diff;
      link.code = code;
      return link;
    })
    .filter(([curr, next]) => next)
    .sort((a, b) => d3.ascending(a.diff, b.diff));

  return {
    years,
    names,
    codes,
    nodes,
    links,
  };
}
