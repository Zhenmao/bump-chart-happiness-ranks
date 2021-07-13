class MultipleSelect {
  constructor({ selectEl, options, onChange }) {
    this.selectEl = selectEl;
    this.options = options;
    this.onChange = onChange;
    this.selected = [];
    this.init();
  }

  init() {
    d3.select(this.selectEl)
      .selectAll("option")
      .data(this.options)
      .join("option")
      .attr("value", (d) => d.value)
      .text((d) => d.text);

    $(this.selectEl)
      .select2()
      .on("change", () => {
        const selected = $(this.selectEl)
          .select2("data")
          .map((d) => d.id);
        if (JSON.stringify(selected) !== JSON.stringify(this.selected)) {
          this.selected = selected.slice();
          this.onChange(this.selected);
        }
      });
  }
}
