#!/usr/bin/env bash

PKG="data-science-ontology"

DOCKER="epatters"
NODE="./node/build"

wsk package update --shared yes $PKG -a description "Data Science Ontology"

wsk action update --web true $PKG/dot_to_cytoscape \
  "$NODE/dot_to_cytoscape.bundle.js" \
  -a description "Convert Graphviz output to Cytoscape data"

wsk action update --web true $PKG/graphviz \
  --docker $DOCKER/whisk-graphviz \
  -a description "Run Graphviz"

wsk action update --web true $PKG/graphviz_to_cytoscape \
  --sequence $PKG/graphviz,$PKG/dot_to_cytoscape \
  -a description "Run Graphviz and convert output to Cytoscape data"

wsk action update $PKG/catlab \
  --docker $DOCKER/whisk-catlab \
  -a description "Run a subaction in Catlab"
