#!/usr/bin/env bash

PKG="data-science-ontology"
CLOUDANT_PKG="Bluemix_Cloudant_Root"
CLOUDANT_DBNAME="data-science-ontology"

DOCKER_USERNAME="epatters"
NODE="./node/build"

JULIA_VERSION=0.6
JULIA_BUILD="julia/v${JULIA_VERSION}"

# Package
#########

wsk package update --shared yes $PKG -a description "Data Science Ontology"

# Actions
#########

echo "Preparing zip bundle for $PKG/catlab"
pushd catlab > /dev/null
rm -rf build/
mkdir -p build/${JULIA_BUILD}
cp action.jl build/exec
cd build
cp -r ~/.julia/v${JULIA_VERSION}/OpenDiscCore ${JULIA_BUILD}
rm -rf ${JULIA_BUILD}/OpenDiscCore/.git ${JULIA_BUILD}/OpenDiscCore/lang
zip -r exec.zip exec ${JULIA_BUILD}/OpenDiscCore
popd > /dev/null

wsk action update $PKG/catlab catlab/build/exec.zip \
  --docker $DOCKER_USERNAME/whisk-catlab \
  -a description "Run a subaction in Catlab"

wsk action update $PKG/graphviz \
  --docker $DOCKER_USERNAME/whisk-graphviz \
  --param prog dot \
  --param format json0 \
  -a description "Run Graphviz"

wsk action update $PKG/dot_json_to_cytoscape \
  "$NODE/dot_json_to_cytoscape.bundle.js" \
  -a description "Convert Graphviz output (JSON format) to Cytoscape data"

wsk action update $PKG/graphviz_to_cytoscape \
  "$NODE/graphviz_to_cytoscape.bundle.js" \
  -a description "Convert Graphviz input (dot format) to Cytoscape data"

wsk action update $PKG/morphism_to_cytoscape \
  "$NODE/morphism_to_cytoscape.bundle.js" \
  -a description "Convert a morphism expression to Cytoscape data"

wsk action update $PKG/annotation_changed \
  "$NODE/annotation_changed.bundle.js" \
  -a description "Action fired when annotation document is created or updated"

# Triggers
##########

# Note: Trigger are not allowed inside packages, hence the naming convention.

wsk trigger create trigger-dso-concept --feed "$CLOUDANT_PKG/changes" \
  --param dbname "$CLOUDANT_DBNAME" \
  --param filter "schema/by_schema" \
  --param query_params '{"schema":"concept"}'

wsk trigger create trigger-dso-annotation --feed "$CLOUDANT_PKG/changes" \
  --param dbname "$CLOUDANT_DBNAME" \
  --param filter "schema/by_schema" \
  --param query_params '{"schema":"annotation"}'
