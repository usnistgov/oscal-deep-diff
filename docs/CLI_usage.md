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
  -v, --verbose                  Print more output (default: false)
  -h, --help                     display help for command
```

## Basic Comparison

To do a basic comparison, only the `--leftCatalog` and `--rightCatalog` options are required. Note that this will print a potentially huge object to your console's output.
```
$ oscal-deep-diff --leftCatalog "NIST_SP-800-53_rev4_catalog.json" --rightCatalog "NIST_SP-800-53_rev5-FPD_catalog.json"
(output trimmed)
```
To save this output to a file, you can either use redirection:
```
oscal-deep-diff --leftCatalog "NIST_SP-800-53_rev4_catalog.json" --rightCatalog "NIST_SP-800-53_rev5-FPD_catalog.json" > output.json
```
Or you can use the provided `--write` flag
```
$ oscal-deep-diff --leftCatalog "NIST_SP-800-53_rev4_catalog.json" --rightCatalog "NIST_SP-800-53_rev5-FPD_catalog.json" --write "output.json"
Saving compared document to output.json
```

## Constraints

To constrain a comparison, you can specify patterns of properties that should be ignored using the `--ignore`` flag, and you can specify how arrays of objects should be matched using the `--constraints` flag. Consult the [constraints document](./constraints.md) for more details.

## Miscellaneous Flags

* `--verbose`: When specified, the system will print additional debug information, such as the time it took to complete the comparison.
* `--disableMemoization`: When specified, the comparator will not cache the results of sub-comparisons, significantly sacrificing runtime in order to decrease memory usage. See issue #4 for more details.