<% for (let imp of imports) { %>export * from '<%= imp.path() %>';
<% } %>
// #region Custom
// #endregion Custom
