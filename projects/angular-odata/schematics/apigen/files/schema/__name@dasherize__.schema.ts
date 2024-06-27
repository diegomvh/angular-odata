export enum <%= classify(name) %>Schema {<% for(let member of members) { %>
  <%= member.name %> = <%= member.value %>,<% } %>
}