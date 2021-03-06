# CLI Usage
To use this application in the command line, the two documents you are comparing must be JSON files.

*You can find some example catalogs [here](https://github.com/usnistgov/OSCAL/tree/master/content).*

To see all available options, use the `-h` or `--help` flag:
```
$ oscal-deep-diff --help
Usage: oscal-deep-diff [options]

Deep Differencing of OSCAL catalogs

Options:
  -V, --version                  output the version number
  -l, --leftCatalog <filename>   Left (old) document to compare (in JSON representation)
  -r, --rightCatalog <filename>  Right (new) document to compare (in JSON representation)
  -c, --constraints <filename>   Specify a constraints file to read from (default: "")
  -i, --ignore [patterns]        Specify patterns of pointers that should be ignored (ex. 'id' or '**/back-matter' (default: "")
  -w, --write <filename>         File to output difference document to (default: "")
  --disableMemoization           Disable the caching of array object (only use in low-memory scenarios) (default: false)
  --excludeContent               Exclude "leftElement" and "rightElement" objects, reducing comparison size (default: false)
  --ignoreCase                   Ignore string comparisons with different cases (e.g. "Action" vs "action") (default: false)
  -v, --verbose                  Print more output (default: false)
  -h, --help                     display help for command
```

## Basic Comparison

To do a basic comparison, only the `--leftCatalog` and `--rightCatalog` options are required. Note that this will print a lot to your console's output, so you may want to pipe the output through a pager such as `less`.
```
$ oscal-deep-diff --leftCatalog "NIST_SP-800-53_rev4_catalog.json" --rightCatalog "NIST_SP-800-53_rev5-FPD_catalog.json"
(output trimmed)
```
To save this output to a file, you can use the provided `--write` flag to output the JSON form:
```
$ oscal-deep-diff --leftCatalog "NIST_SP-800-53_rev4_catalog.json" --rightCatalog "NIST_SP-800-53_rev5-FPD_catalog.json" --write "output.json"
Saving compared document to output.json
```

This tool is designed to fit a wide array of circumstances. Because of this, the default unconstrained comparison may not suit your needs. The comparison behavior can be modified using the above flags.

## Constraints

To constrain a comparison, you can specify patterns of properties that should be ignored using the `--ignore`` flag, and you can specify how arrays of objects should be matched using the `--constraints` flag. Consult the [constraints document](./constraints.md) for more details.

## Miscellaneous Flags

* `--verbose`: When specified, the system will print additional debug information, such as the time it took to complete the comparison.
* `--disableMemoization`: When specified, the comparator will not cache the results of sub-comparisons, significantly sacrificing runtime in order to decrease memory usage. See issue #4 for more details.
* `--excludeContent`: when specified, the output document will not include any content from the left or right documents, only displaying the JSON pointers of changed elements. See #13 for more details.
* `--ignoreCase`: comparisons between strings do not take case into account.