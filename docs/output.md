# Output
This document describes the output format of the deep diff tool.

When a comparison is made, the output is simply a JSON document.
The root of the comparison document contains 3 properties, `leftDocument`, `rightDocument` and `changes`. Left and right document refer to the path of the documents specified. When using `oscal-deep-diff` as a library, these are set manually and can refer to a URL. The `changes` property contains a list of changes that the comparator has found.

The change types are:
* `property_changed`: The property exists in both documents, but it has changed.
* `peoperty_added`: The property exists only in the right document.
* `property_deleted`: The property exists only in the left document.
* `array_changed`: An array of items has changed. This change type is more complex, containing within it array items that are only present in the right document, only present in the left document, and those that are present in both documents, but contain differences in a sub-document.