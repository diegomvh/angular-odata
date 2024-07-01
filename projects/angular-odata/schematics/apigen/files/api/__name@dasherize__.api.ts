export const <%= classify(name) %>Api = {
  EnumTypes: {<% for(let enumType of enumTypes) { %>
    <%= enumType.name %>: '<%= enumType.type %>',<% } %>
  },
  StructuredTypes: {<% for(let structuredType of structuredTypes) { %>
    <%= structuredType.name %>: '<%= structuredType.type %>',<% } %>
  },
  EntitySets: {<% for(let entitySet of entitySets) { %>
    <%= entitySet.name %>: '<%= entitySet.entityType %>',<% } %>
  },
  Singletons: {<% for(let singleton of singletons) { %>
    <%= singleton.name %>: '<%= singleton.type %>',<% } %>
  }
}