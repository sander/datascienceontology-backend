import * as assert from "assert";

import * as Cytoscape from "./interfaces/cytoscape";
import * as Graphviz from "./interfaces/graphviz";

// XXX: Official types are borked due to TypeScript/CommonJS incompatibility:
// https://github.com/Microsoft/TypeScript/issues/5565#issuecomment-155171298
const striptags: (html: string) => string = require("striptags");


/* Convert Graphviz xdot output (parsed as JSON) into Cytoscape data.
 */
export function dotToCytoscape(dot: Graphviz.Graph): Cytoscape.Cytoscape {
  let elements: Cytoscape.Element[] = [];
  
  // Convert nodes, ignoring the subgraphs. Note that this does not exclude
  // any nodes, only the subgraph structure.
  const offset = dot._subgraph_cnt;
  for (let obj of dot.objects.slice(offset)) {
    elements.push(dotNodeToCytoscape(obj as any)); // obj as Node
  }
  
  // Convert edges.
  const nodes = (id: number) => elements[id - offset];
  for (let edge of dot.edges) {
    if (edge.style === "invis") {
      // Omit invisible edges, which are used to tweak layout in Graphviz.
      continue;
    }
    elements.push(dotEdgeToCytoscape(edge, nodes));
  }
  
  return {
    elements: elements,
    layout: {
      name: "preset"
    },
    style: [
      {
        selector: "node.graphviz",
        style: {
          label: "data(label)",
          width: "data(width)",
          height: "data(height)"
        }
      },
      {
        selector: "edge.graphviz",
        style: {
          "source-endpoint": "data(source-endpoint)",
          "target-endpoint": "data(target-endpoint)"
        }
      },
      {
        selector: ".graphviz-invis",
        style: {
          visibility: "hidden"
        }
      }
    ]
   };
}

function dotNodeToCytoscape(node: Graphviz.Node): Cytoscape.Element {
  // Create element data.
  let data: Cytoscape.ElementData = {
   /* Confusingly, we assign the Graphviz name to the Cytoscape ID and vice
      versa. The reason is that the Graphviz names are guaranteed to be unique,
      while the user-defined Graphviz IDs need not be.
    */
    id: node.name,
    
    // Only assign label if node default is overridden.
    // Strip all tags from Graphviz "HTML-like" labels.
    label: node.label !== "\\N" ? striptags(node.label).trim() : node.name,
    
    width: round(inchesToPoints(parseFloat(node.width)), 3),
    height: round(inchesToPoints(parseFloat(node.height)), 3)
  }
  if (node.id !== undefined) {
    data.name = node.id;
  }

  // Create element.
  let classes = [ "graphviz" ];
  if (node.style !== undefined) {
    classes.push(`graphviz-${node.style}`);
  }
  return {
    group: "node",
    class: classes.join(" "),
    data: data,
    // Position refers to node *center* in both Graphviz and Cytoscape.
    position: parsePoint(node.pos)
  };  
}

function dotEdgeToCytoscape(edge: Graphviz.Edge,
                            nodes: (id: number) => Cytoscape.Element): Cytoscape.Element {
  const source = nodes(edge.tail);
  const target = nodes(edge.head);
  const spline = parseSpline(edge.pos);
  let classes = [ "graphviz" ];
  if (edge.style !== undefined) {
    classes.push(`graphviz-${edge.style}`);
  }
  return {
    group: "edge",
    class: classes.join(" "),
    data: {
      source: source.data.id,
      target: target.data.id,
      "source-endpoint": [
        round(spline[0].x - source.position.x, 3),
        round(spline[0].y - source.position.y, 3)
      ],
      "target-endpoint": [
        round(spline.slice(-1)[0].x - target.position.x, 3),
        round(spline.slice(-1)[0].y - target.position.y, 3)
      ]
    }
  };
}


interface Point {
  x: number;
  y: number;
}

function parseFloatArray(s: string): number[] {
  return s.split(",").map(parseFloat);
}

/* Parse Graphviz point.

  http://www.graphviz.org/doc/info/attrs.html#k:point
*/
function parsePoint(s: string): Point {
  const point = parseFloatArray(s);
  assert(point.length == 2);
  return { x: point[0], y: point[1] }
}

/* Parse Graphviz spline.

  Ignores start/end points for arrow head.
  http://www.graphviz.org/doc/info/attrs.html#k:splineType
*/
function parseSpline(spline: string): Point[] {
  return spline
    .split(" ")
    .filter((s) => !(s.startsWith("s") || s.startsWith("e")))
    .map(parsePoint);
}

// 72 points per inch in Graphviz.
const inchesToPoints = (x: number) => 72*x;

function round(x: number, places: number = 0) {
  const mult = 10**places;
  return Math.round(x * mult) / mult;
}
