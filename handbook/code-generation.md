# Code generation

The library includes Angular schematics that read a `$metadata` document and generate a
typed client.

## `apigen`

```bash
ng generate angular-odata:apigen --name=TripPin --metadata='https://services.odata.org/V4/TripPinServiceRW/$metadata'
```

| Option           | Description                                                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `name`           | Name of the generated API. Also used for the folder and the file names. Required.                                                      |
| `metadata`       | URL of the `$metadata` document. Required. The service root URL is derived from it.                                                    |
| `path`           | Folder in which to create the API. Defaults to the source folder of the project.                                                       |
| `project`        | Angular project. Defaults to the current project.                                                                                      |
| `models`         | Generate model and collection classes. Default: `true`.                                                                                |
| `staticMetadata` | Save the metadata to `metadata.json` and build the configuration from it, instead of fetching `$metadata` at startup. Default: `true`. |

The schematic creates a folder named after the API. For TripPin, the demo application has:

```
trip-pin/
  index.ts                 # Barrel: import everything from './trip-pin'
  trip-pin.config.ts       # TripPinConfig: the ODataApiConfig
  trip-pin.module.ts       # TripPinModule: provides every generated service
  metadata.json            # When staticMetadata is true
  Microsoft/OData/SampleService/Models/TripPin/   # One folder per schema namespace
    person.entity.ts       # interface Person
    person.model.ts        # class PersonModel
    person.collection.ts   # class PersonCollection
    person-gender.enum.ts  # enum PersonGender
    location.complex.ts    # interface Location (complex type)
    people.service.ts      # class PeopleService (entity set)
    me.service.ts          # class MeService (singleton)
    default-container.service.ts   # Unbound functions and actions
```

Models and collections are generated only when `models` is `true`.

Register the generated configuration:

```typescript
import { provideODataClient } from 'angular-odata';
import { TripPinConfig } from './trip-pin';

export const appConfig: ApplicationConfig = {
  providers: [provideODataClient({ config: TripPinConfig })],
};
```

## Custom code

The generated files contain `// #region Custom` and `// #endregion Custom` blocks. Put your
own code inside them: when you run the schematic again, it keeps the content of these blocks
and overwrites everything else. If the number of blocks in the new file differs from the old
one, the schematic prints a warning and does not keep them.

## `metadata`

The `metadata` schematic downloads a `$metadata` document and saves it as JSON:

```bash
ng generate angular-odata:metadata --url='https://services.odata.org/V4/TripPinServiceRW/$metadata'
```
