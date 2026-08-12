import { ODataApiConfig, EDM_PARSERS, ODataVersion } from 'angular-odata';
<% if (staticMetadata) { %>import { ODataMetadata } from 'angular-odata';
import * as json from './metadata.json';<% } %><% for (let imp of imports) { %>
import { <%= imp.resolve().join(", ") %> } from '<%= imp.path() %>';<% } %>

// #region Custom
// #endregion Custom
export const <%= classify(name) %> = <% if (staticMetadata) { %>ODataMetadata.fromJson(json).toConfig(<% } %>{
  serviceRootUrl: '<%= serviceRootUrl %>',
  metadataUrl: '<%= metadataUrl %>',
  name: '<%= apiConfigName %>',
  version: '<%= version %>' as ODataVersion,
  creation: new Date('<%= creation.toISOString() %>'),
  parsers: EDM_PARSERS,
  populateFromMetadata: <%= staticMetadata ? "false" : "true" %>,
  models: {<% for(const model of models) { %>
    '<%= model.entityType() %>': <%= model.importedName(imports) %>, <% } %>
  },
  collections: {<% for(const col of collections) { %>
    '<%= col.entityType() %>': <%= col.importedName(imports) %>, <% } %>
  }
}<% if (staticMetadata) { %>)<% } %> as ODataApiConfig;
// #region Custom
// #endregion Custom
