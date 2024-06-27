export interface <%= classify(name) %>Config {<% for(let property of properties) { %>
  <%= property.name %>: <%= property.type %>;<% } %>
}