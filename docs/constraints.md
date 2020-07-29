# Constraints

## Ignore Constraints
The comparisons that this tool creates may be too broad by default, including changes to fields that may not be important to the user, such as `id` and `uuid` fields. Sometimes entire sub-objects should be ignored because so much has changed that the sub-documents are uncomparable, such as the `back-matter` subobject in a Catalog.

*Note that this tool has been designed to be as general as possible, so that comparisons can be tuned to the specific needs of the user.*

An ignore constraint will cause the comparator to simply not consider a certain property or sub-object. Ignore constraints can be added using the the `--ignore` flag when using the CLI or by setting the `ignoreConditions` parameter in the constructor of the `Comparator` object when using the library.

*Note that when using the CLI, multiple constraints can be passed into the `--ignore` flag by using a comma delimiter*

Ignore constraints do not have to be single properties, more complex ignore constraints can be specified. An example is below.

pattern | description | note
--------|-------------|--------
`id` | ignore all `id` flags |
`/catalog/metadata` | ignore the metadata subobject within the root catalog object | starting the pattern with a `/` requires that the pattern starts at the root
`controls/#/links` | within the `controls` array, ignore the `links` property of all items | `*` can also be used as a wildcard

## Match Constraints
Match constraints (specified using the `--constraints` flag in the CLI) control how JSON arrays are matched with each other. The comparator must match array elements (for example, groups within a catalog) before it can compare the properties within the array. These constraints are specified using a seperate JSON file.

Below is an example constraints file:
```json
[
    {
        "condition": "/catalog/groups",
        "constraint": {
            "constraint_name": "ObjectPropertyMatchConstraint",
            "matchType": "literal",
            "propertyName": "id",
            "secondaryProperties": [
                "class"
            ]
        }
    }
    {
        "condition": "/catalog/metadata/parties/#/org/addresses/#/postal-address",
        "constraint": {
            "constraint_name": "PrimitiveMatchConstraint",
            "matchType": "string-similarity"
        }
    },
]
```
This constraints file has two constraints. It happens to showcase the two types of match constraints that have been created so far.

The first match constraint applies to groups within a catalog. It states that all groups are matched by their `id` property, and that the `class` property must also match.

The second match constraint applies specifically to a postal address within the metadata parties list. It says that the list of address lines within this postal address should be matched via string-similarity.