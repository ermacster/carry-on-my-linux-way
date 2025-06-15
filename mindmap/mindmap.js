d3.json("data.json").then(function(data) {
  const width = 800;
  const height = 600;

  const svg = d3.select("#mindmap")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const tree = d3.tree().size([height, width - 160]);
  const root = d3.hierarchy(data);
  const links = tree(root).links();
  const nodes = root.descendants();

  const link = svg.selectAll(".link")
    .data(links)
    .enter().append("path")
    .attr("class", "link")
    .attr("d", d3.linkHorizontal()
      .x(d => d.y)
      .y(d => d.x));

  const node = svg.selectAll(".node")
    .data(nodes)
    .enter().append("g")
    .attr("class", "node")
    .attr("transform", d => `translate(${d.y},${d.x})`);

  node.append("circle")
    .attr("r", 5);

  node.append("text")
    .attr("dy", ".35em")
    .attr("x", d => d.children ? -8 : 8)
    .style("text-anchor", d => d.children ? "end" : "start")
    .text(d => d.data.name);
});