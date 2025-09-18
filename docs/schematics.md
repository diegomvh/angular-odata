# Schematics

The angular-odata library includes schematics that allow generating TypeScript code from OData metadata. 
By using the ng generate command along with the appropriate parameters, it is possible to create a module that defines all the types specified in the OData metadata document. 
These types are mapped to their TypeScript equivalents as follows:

**EdmTypes**: mapped to the corresponding primitive types in TypeScript, such as string, number, boolean, etc.

**EnumType**: converted to a TypeScript enum.

**EntityType and ComplexType**: converted to TypeScript interfaces.

**EntitySets**: converted to Angular services.

**Functions**: added to the generated services.

**Actions**: added to the generated services.


```bash
ng generate angular-odata:apigen --name=TripPin --metadata=https://services.odata.org/V4/TripPinServiceRW/\$metadata

```


```json
{
  "compilerOptions": {
    "resolveJsonModule": true
  }
}
```