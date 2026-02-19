import { NgModule } from '@angular/core';<% for (let imp of imports) { %>
import { <%= imp.resolve().join(", ") %> } from '<%= imp.path() %>';<% } %>

// #region Custom
// #endregion Custom
@NgModule({
  providers: [<% for(let service of services) { %>
    <%= service.name() %>,<% } %>
  ]
})
export class <%= classify(name) %> { }
