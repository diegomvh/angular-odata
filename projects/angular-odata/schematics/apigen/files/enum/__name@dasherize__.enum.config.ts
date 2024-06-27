export enum <%= classify(name) %>Config {<% for(let member of members) { %>
  <%= member.name %> = <%= member.value %>,<% } %>
}