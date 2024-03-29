# Testing

## Local Testing

### Lint

To ensure that your changes are consistent with the project coding style, run `npm run lint`.
This checks the repository against a variety of [ESLint](https://eslint.org/) rules, including (but not limited to):

-   Consistent spacing and indentation
-   The presence of the NIST license/distribution notice in all source files
-   Anti-patterns such as unused symbols

Some issues can be fixed automatically by running `npm run lint-fix`.

The linter is invoked by GitHub Actions when a pull request is run via the [Lint and Test workflow](./.github/workflows/test.yaml).
Lint checks must pass before a pull request can be merged.

### Test

Tests can be found along source code in files with the `.spec.` infix.
To run all unit tests, run `npm run test`.
A test coverage report can be generated by running `npm run coverage`.
This project uses [Mocha](https://mochajs.org/) to run tests, and [Istanbul (NYC)](https://istanbul.js.org/) to generate coverage reports.

These tests are run by GitHub Actions when a pull request is run via the [Lint and Test workflow](./.github/workflows/test.yaml).
Tests must pass before a pull request can be merged.

## CI/CD

### Testing and Evaluation

**SA-11: Developer Security Testing And Evaluation**:
The NIST ITL CSD developers that maintain the `oscal-deep-diff` application system at all post-design stages of the system development life cycle:

-   Perform unit and integration testing/evaluation for every commit in a development branch submitted for code review in the form of a pull request sent to the development team before merging it to the main release branch at the development team's recommended level of depth and coverage as described in the code coverage tool's configuration file [`.nycrc`](./.nyrc);
-   Produce evidence of the execution of the assessment plan and the results of the testing and evaluation;
-   Implement a verifiable flaw remediation process;
-   Correct flaws identified during testing and evaluation
    The required coverage is defined in this repository by the config file [`.nycrc`](./.nycrc).

This check is performed by GitHub Actions via the [Lint and Test workflow](./.github/workflows/test.yaml) for all pull requests.

#### Static Code Analysis

**SA-11(02): Threat Modeling and Vulnerability Analysis**:
The NIST ITL CSD developers that maintain `oscal-deep-diff` are required to employ static code analysis tools to identify common flaws and document the results of the analysis.

This check is performed by GitHub Actions via the [CodeQL Analysis workflow](./.github/workflows/codeql-analysis.yaml) as well as the linting portion of the [Lint and Test workflow](./.github/workflows/test.yaml).

#### Vulnerability Analysis

**SA-11(02): Threat and Vulnerability Analyses**:
The NIST ITL CSD developers that maintain `oscal-deep-diff` are required to perform vulnerability analyses during development and the subsequent testing and evaluation of the system that:

-   Uses the following contextual information:
    -   The library dependencies as defined in this project's lock file [`package-lock.json`](./package-lock.json);
-   Employs the following tools and methods:
    -   [Dependabot](https://github.com/dependabot);
-   Produces evidence that meets the following acceptance criteria:
    -   All project dependencies on the main branch, as well as dependencies on incoming pull requests, have no known applicable reported vulnerabilities;

Vulnerability alerts are published to [this dashboard](https://github.com/usnistgov/oscal-deep-diff/security/dependabot) and via email.

#### Manual Code Reviews

**SA-11(04): Manual Code Reviews**:
The NIST ITL CSD developers that maintain `oscal-deep-diff` are required to perform a manual code review of all incoming pull requests using the following processes, procedures, and/or techniques:

-   Organization-defined members are required to provide a review before a pull request can be merged, as defined in the [`CODEOWNERS`](./.github/CODEOWNERS) file;
