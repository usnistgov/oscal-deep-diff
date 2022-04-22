# OSCAL Deep Diff

OSCAL Deep Diff is a CLI application and library that can produce schema-agnostic comparisons of JSON artifacts.
This tool was developed to compare [OSCAL](https://pages.nist.gov/OSCAL/) artifacts.

## Usage

For end-to-end examples of usage, refer to the [`examples/`](./examples/) directory.

### CLI Installation

```
$ npm install -g @oscal/oscal-deep-diff
```

### A Basic Comparison

The OSCAL Deep Diff CLI requires a configuration file to perform a comparison.
A sample configuration file is provided below:

```yaml
leftPath: NIST_SP-800-53_rev5_catalog.json #replace with the JSON documents you want to compare
rightPath: NIST_SP-800-53_rev5_catalog.json
outputPath: output.json
# these will be explained further in this document
comparatorConfig: {}
outputConfigs: []
```

This configuration file tells the deep diff tool to compare two documents and produce an output file `output.json`.
Sample OSCAL artifacts can be found [here](https://github.com/usnistgov/oscal-content).

To perform a comparison, use the following command:

```bash
# Replace "config.yaml" with the configuration file you created in the last step
$ oscal-deep-diff --config config.yaml
```

### Configuration

The OSCAL deep diff's comparison behavior can be changed in order to fit the needs of your comparison.
For example, when comparing two documents, you may want to ignore some subset of changes, say `id` fields, as they are not stable from one revision of a document to the next.
It may also be desirable to ignore case on some fields, or to ignore an entire subset of the documents.

JSON documents can be very complex, involving nested arrays of objects.
The deep diff tool can match arrays of objects even if they are out of order, but this behaviour can be constrained in order to fit the needs of your comparison.
For example, when comparing two revisions of an [OSCAL Catalog](https://pages.nist.gov/OSCAL/concepts/layer/control/catalog), the tool must correctly match controls between the two documents together.
This matching behavior can be changed in many ways, such as matching controls directly by ID (`AC-1` always maps to `AC-1` and so on) or by selecting the pair of control objects that minimize the number of "sub-changes" that matching pair produces.

The `comparatorConfig` field of the OSCAL Deep Diff configuration controls all of this behavior.

#### Anatomy

The comparator config contains a map of JSON pointers to configuration objects.

Below is an example of a comparator config that is tailored for an [OSCAL Catalog](https://pages.nist.gov/OSCAL/concepts/layer/control/catalog/):

```yaml
comparatorConfig:
    '*':
        ignoreCase: true
    'controls/#':
        ignore:
            - controls
    id:
        ignoreCase: false
        priority: 1
    /catalog:
        ignore:
            - back-matter
```

In this example, the comparator will have the following behavior:

-   `*`: All fields will be compared in a case-insensitive manner (glob-like syntax is supported)
-   `controls/#`: Every control's sub-controls (enhancements) will be ignored
-   `id`: Any `id` field will be compared with case-sensitivity, overriding the `*` configuration
-   `/catalog`: When the `/catalog` is being compared, ignore the `back-matter` field.

Notice, that each item of the configuration map tells the comparator **how to compare elements whose JSON pointers match the pattern**.
This check happens for all JSON types, objects (such as `/catalog`), primitives (such as `id`), and arrays (such as `controls`).

#### Object Configuration

-   `ignore: string[]`: Used to ignore properties of an object that are not relevant to the comparison.

#### Primitive Configuration

-   `ignoreCase: boolean`: Used for case-insensitive comparisons of string elements.
-   `stringComparisonMethod: 'jaro-wrinkler' | 'cosine' | 'absolute'`: For string elements, this setting controls how string are weighted, using the [Jaro-Wrinkler](https://en.wikipedia.org/wiki/Jaro%E2%80%93Winkler_distance), cosine, or absolute edit distance strategies.
    As an example, UUIDs should always be compared absolutely, but in some cases there is meaning in properties that are similar to each other.

#### Array Configuration

-   `matcherGenerators: []`: Array comparison is a difficult problem to solve as matching is an expensive operation.
    OSCAL Deep Diff compares arrays by matching array elements that minimize the number of sub-changes.
    This matching can be done in a few ways which all have trade-offs.
    The `matcherGenerator` allows you to specify the ways an array can be compared.
    The following are the types of matcher generators that can be used:

    -   `ObjectPropertyMatcherContainer`: This algorithm matches array items solely by an object property.
        For example, the comparison could be configured to match arrays of objects by finding the objects that have the same `id` property.

        This algorithm yields the quickest results, but requires that the user tailors the comparison to the properties of the document they are comparing.

        Example:

        ```yaml
        matcherGenerators:
            - type: ObjectPropertyMatcherContainer
              property: id
        ```

    -   `OptimalMatcherContainer`: This algorithm finds the properties that a given object array contains, then attempts to match the object by each property using the same logic that the `ObjectPropertyMatcherContainer` uses.
        The property that produces the least number of changes is chosen.
        There are no configuration options for this container.

        Example:

        ```yaml
        matcherGenerators:
            - type: OptimalMacherContainer
        ```

    -   `HungarianMatcherContainer`: The [Hungarian Method](https://en.wikipedia.org/wiki/Hungarian_algorithm) is an algorithm that can be used to match items together.
        When this matcher is selected, the array items are matched together using the following method:

        1. Each possible combination of array items is compared, producing an adjacency matrix of possible combinations and their associated scores.
        1. The adjacency matrix is augmented with additional items representing unmatched elements (allowing items to be marked as added or removed).
        1. An implementation of the hungarian algorithm is called on the adjacency matrix, producing an array of pairs.

        This algorithm is the most expensive, both in terms of space and time.
        It is also the most likely option to yield good results without any tweaking.

        Example:

        ```yaml
        matcherGenerators:
            - type: HungarianMatcherContainer
        ```

-   `outOfTreeEnabled: boolean`: When enabled, out of tree comparisons can take place.
    This option is useful when dealing with nested arrays of objects, where the object could move from one sub-array to another.
    A good example of this is [OSCAL Catalog](https://pages.nist.gov/OSCAL/concepts/layer/control/catalog/) model, which has controls which are organized into groups.
    If `outOfTreeEnabled` is set to true on the `control`, the comparator will check for controls that move between groups.

#### Misc. Configuration

-   `priority: number`: In the event that two pointers match, priority is used to decide which settings to use. A higher priority means overlaping settings will take precedence.

### Output

When a comparison is made, the output is simply a JSON document.
The root of the comparison document contains 3 properties, `leftDocument`, `rightDocument` and `changes`.
Left and right document refer to the path of the documents specified.
When using `oscal-deep-diff` as a library, these are set manually and can refer to a URL. The `changes` property contains a list of changes that the comparator has found.

The change types are:

-   `property_changed`: The property exists in both documents, but it has changed.
-   `property_added`: The property exists only in the right document.
-   `property_deleted`: The property exists only in the left document.
-   `array_changed`: An array of items has changed. This change type is more complex, containing within it array items that are only present in the right document, only present in the left document, and those that are present in both documents, but contain differences in a sub-document.

### Alternative Outputs

The `outputConfigs` property of the comparison is used to transform the raw output into a more easily digesteable document.

For example, a comparison of two [OSCAL Catalogs](https://pages.nist.gov/OSCAL/concepts/layer/control/catalog/) is generally pretty unweildly as the number of controls increases.
The raw output can be transformed into an Excel document that collects all of the control-level changes.

```yaml
outputConfigs:
    - selection: controls
      identifiers:
          - 'id'
          - 'title'
      outputType: excel
      outputPath: output.xlsx
```
