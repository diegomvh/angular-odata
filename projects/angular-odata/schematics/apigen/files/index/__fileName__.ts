<% for (let exp of exports) { %>export { <%= exp.resolve().join(", ") %> } from '<%= exp.path() %>';
<% } %>
// #region Custom
// #endregion Custom
