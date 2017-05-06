$(document).ready(function() {
  var updateDag = function(data, cache) {
        var cacheStatus, cacheContents;

        var present = data.present || false;
        var contents = data.dot_content || [];

        if (cache !== undefined) {
            cacheStatus = cache.status || false;
            cacheContents = cache.dot_content || [];
        }

        if ((present === cacheStatus) && (contents.length === cacheContents.length)) {
            return;
        }

        $(".dag").empty();

        if (!present) {
            $(".dag").append("<p>No graph data.</p>")
            return;
        }

        var stringContents = contents.map(function(e) {
            return String.fromCharCode(e);
        }).join("");
        $(".dag").append(Viz(stringContents));
  };

  $.get("/api/dag", function(data) {
      updateDag(data, undefined);
      setInterval(function(cache) {
          $.get("/api/dag", function(data) {
              updateDag(data, cache)
          });
        }, 10000, data);
  });

  $("#logo").fadeOut("slow", function() {

    $("#header").fadeIn();
    $("#controls").fadeIn();
    $("#graph").fadeIn();

    var width = 1024,
        height = 768;

    var color = d3.scale.category10();

    var nodes = [],
        links = [];

    var force = d3.layout.force()
        .nodes(nodes)
        .links(links)
        .charge(-400)
        .linkDistance(120)
        .size([width, height])
        .on("tick", tick);

    var svg = d3.select("#topology").append("svg")
        .attr("width", width)
        .attr("height", height);

    var node = svg.selectAll(".node"),
        link = svg.selectAll(".link");

    var update = function(response) {

        // Add any missing nodes.
        $.each(response.nodes, function(key, value) {
            var result = findNode(nodes, value.id);
            if (result == undefined) {
                nodes.push(value);
            }
        });

        // Remove deleted nodes.
        $.each(nodes, function(key, value) {
            // Prevent from splice during iteration by ignoring
            // undefined values.
            if(value != undefined) {
                var result = findNodeIndex(response.nodes, value.id);
                if (result == undefined) {
                    nodes.splice(key, 1);
                }
            }
        });

        // Add any missing links.
        $.each(response.links, function(key, value) {
            var result = findLink(links, value.source, value.target);
            var sourceNode = findNode(nodes, value.source);
            var targetNode = findNode(nodes, value.target);
            if (result == undefined) {
                links.push({source: sourceNode, target: targetNode});
            }
        });

        // Remove deleted links.
        for(var i = links.length; i--;){
            // Prevent from splice during iteration by ignoring
            // undefined values.
            if(links[i] != undefined) {
                if(typeof links[i].source === 'object') {
                    var result = findLinkIndex(response.links, links[i].source.id, links[i].target.id);
                } else {
                    var result = findLinkIndex(response.links, links[i].source, links[i].target);
                }
                if (result == undefined) {
                    links.splice(i, 1);
                }
            }
        }

        start();
    };

    // Invoke immediately and schedule refreshes.
    $.get("/api/status", function(response) {
        update(response);

        setInterval(function() {
            $.get("/api/status", function(response) {
                update(response);
            });
        }, 2000);
    });

    function start() {
      link = link.data(force.links(), function(d) { return d.source.id + "-" + d.target.id; });
      link.enter().insert("line", ".node").attr("class", "link");
      link.exit().remove();

      node = node.data(force.nodes(), function(d) { return d.id;});
      node.enter().append("g");

      node.append("image")
           .attr("xlink:href", "images/lasp-logo-large.png")
           .attr("x", -8)
           .attr("y", -8)
           .attr("width", 16)
           .attr("height", 16);

      node.append("text")
          .attr("dx", 12)
          .attr("dy", ".35em")
          .text(function(d) { return d.name });

      node.exit().remove();

      force.start();
    }

    function tick() {
      node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

      link.attr("x1", function(d) { return d.source.x; })
          .attr("y1", function(d) { return d.source.y; })
          .attr("x2", function(d) { return d.target.x; })
          .attr("y2", function(d) { return d.target.y; });
    }

    // Taken from: http://stackoverflow.com/questions/9539294/adding-new-nodes-to-force-directed-layout
    var findNode = function (nodes, id) {
        for (var i=0; i < nodes.length; i++) {
            if (nodes[i].id === id)
                return nodes[i]
        };
    }

    var findLink = function (links, source, target) {
        for (var i=0; i < links.length; i++) {
            if (links[i].source.id === source && links[i].target.id === target)
                return links[i]
        };
    }

    // Taken from: http://stackoverflow.com/questions/9539294/adding-new-nodes-to-force-directed-layout
    var findNodeIndex = function (nodes, id) {
        for (var i=0; i < nodes.length; i++) {
            if (nodes[i].id === id)
                return i
        };
    }

    var findLinkIndex = function (links, source, target) {
        for (var i=0; i < links.length; i++) {
            if (links[i].source === source && links[i].target === target)
                return i
        };
    }

  });
});
