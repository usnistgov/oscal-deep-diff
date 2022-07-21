# Contributing to the OSCAL Project

This page is for potential contributors to the OSCAL project's oscal-deep-diff.
It provides basic information on the OSCAL project, describes the main ways people can make contributions, explains how to report issues with OSCAL, and lists pointers to additional sources of information.

## Project approach

The approach we’re taking with OSCAL is agile. We’re adopting the philosophy of implementing the 20% of the functionality that solves 80% of the problem. We’re trying to focus on the core capabilities that are needed to provide the greatest amount of benefit. Because we’re working on a small set of capabilities, that allows us to make very fast progress. We’re building the features that we believe solve the biggest problems, so we’re providing the most value.

We track our current work items using GitHub [project cards](https://github.com/orgs/usnistgov/projects/25/views/2). Our active project is typically the lowest numbered open project within the previously referenced page.

## Contribution options

The OSCAL project is producing several types of deliverables, including the following:

-   _Constraints_ for defining how OSCAL documents can be compared
-   _Documentation_ to define how the project can be used in a CLI or web project
-   _Comparison Algorithms_ that allow for more detailed comparisons between documents

Contributions are welcome in any of these areas. For information on the project's current needs and priorities, see the project's GitHub issue tracker (discussed below). Please refer to the [guide on how to contribute to open source](https://opensource.guide/how-to-contribute/) for general information on contributing to an open source project.

## Issue reporting and handling

All requests for changes and enhancements to OSCAL are initiated through the project's [GitHub issue tracker](https://github.com/usnistgov/oscal-deep-diff/issues). To initiate a request, please [create a new issue](https://help.github.com/articles/creating-an-issue/). The following issue templates exist for creating a new issue:

-   [User Story](https://github.com/usnistgov/oscal-deep-diff/issues/new?template=feature_request.md&labels=enhancement%2C+User+Story): Use to describe a new feature or capability to be added to OSCAL.
-   [Defect Report](https://github.com/usnistgov/oscal-deep-diff/issues/new?template=bug_report.md&labels=bug): Use to report a problem with an existing OSCAL feature or capability.
-   [Question](https://github.com/usnistgov/oscal-deep-diff/issues/new?labels=question&template=question.md): Use to ask a question about OSCAL.

The core OSCAL project team regularly reviews the open issues, prioritizes their handling, and updates the issue statuses and comments as needed.

## Communications mechanisms

There are two mailing lists for the project:

-   *oscal-dev@nist.gov* for communication among parties interested in contributing to the development of OSCAL or exchanging ideas. Subscribe by sending an email to [oscal-dev+subscribe@list.nist.gov](mailto:oscal-dev+subscribe@list.nist.gov). To unsubscribe send an email to [oscal-dev+unsubscribe@list.nist.gov@nist.gov](mailto:oscal-dev+unsubscribe@list.nist.gov).
-   *oscal-updates@nist.gov* for low-frequency updates on the status of the OSCAL project. Subscribe by sending an email to [oscal-updates+subscribe@list.nist.gov](mailto:oscal-updates+subscribe@list.nist.gov). To unsubscribe send an email to [oscal-updates+unsubscribe@list.nist.gov](mailto:oscal-updates+unsubscribe@list.nist.gov).

## Contributing to the OSCAL-deep-diff repository

The OSCAL project uses a typical GitHub fork and pull request [workflow](https://guides.github.com/introduction/flow/). To establish a development environment for contributing to the OSCAL project, you must do the following:

1. Fork the oscal-deep-diff repository to your personal workspace. Please refer to the Github [guide on forking a repository](https://help.github.com/articles/fork-a-repo/) for more details.
1. Create a feature branch from the master branch for making changes. You can [create a branch in your personal repository](https://help.github.com/articles/creating-and-deleting-branches-within-your-repository/) directly on GitHub or create the branch using a Git client. For example, the `git branch working` command can be used to create a branch named _working_.
1. You will need to make your modifications by adding, removing, and changing the content in the branch, then staging your changes using the `git add` and `git rm` commands.
1. Once you have staged your changes, you will need to commit them. When committing, you will need to include a commit message. The commit message should describe the nature of your changes (e.g., added new feature X which supports Y). You can also reference an issue from the OSCAL repository by using the hash symbol. For example, to reference issue #34, you would include the text "#34". The full command would be: `git commit -m "added new feature X which supports Y addressing issue #34"`.
1. Next, you must push your changes to your personal repo. You can do this with the command: `git push`.
1. Finally, you can [create a pull request](https://help.github.com/articles/creating-a-pull-request-from-a-fork/).

### Repository structure

This repository consists of the following directories and files pertaining to the oscal-deep-diff sub-project:

-   [.github/](.github): Contains GitHub issue and pull request templates for the OSCAL project.
-   [.vscode/](.vscode): Contains editor-specific settings and run configurations.
-   [bin/](bin): Contains node executable entry-points for oscal-deep-diff CLI.
-   [examples/](examples): Contains example projects using this library.
-   [meta/](meta): Contains miscellaneous files
-   [src/](src): Houses the source code for this project.
-   [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md): This file contains a code of conduct for OSCAL project contributors.
-   [CONTRIBUTING.md](CONTRIBUTING.md): This file is for potential contributors to the OSCAL project. It provides basic information on the OSCAL project, describes the main ways people can make contributions, explains how to report issues with OSCAL, and lists pointers to additional sources of information. It also has instructions on establishing a development environment for contributing to the OSCAL project and using GitHub project cards to track development sprints.
-   [DEP_LICENSES.md](DEP_LICENSES.md): This file contains a summary of external licenses that this project depends on.
-   [LICENSE.md](LICENSE.md): This file contains license and copyright information for the files in the OSCAL GitHub repository.
-   [package.json](package.json): Configures the project npm package.
-   [package-lock.json](package-lock.json): Contains a snapshot of the npm dependencies for the project.
-   [TESTING.md](TESTING.md): This file explains how the project is tested.
-   [tsconfig.json](tsconfig.json): Configures the typescript compiler settings for building the project.

## Contributing to a Development Sprint

The NIST OSCAL team is using the GitHub [project cards](https://github.com/usnistgov/OSCAL/projects) feature to track development sprints as part of the core OSCAL work stream. A typical development sprint lasts roughly a month, with some sprints lasting slightly less or more to work around major holidays or events attended by the core project team. The active sprint is typically the lowest numbered open project within the previously referenced page.

### User Stories

Each development sprint consists of a set of [user stories](https://github.com/usnistgov/oscal-deep-diff/issues?q=is%3Aopen+is%3Aissue+label%3A%22User+Story%22), that represent features, actions, or enhancements that are intended to be developed during the sprint. Each user story is based on a [template](https://github.com/usnistgov/oscal-deep-diff/issues/new?template=feature_request.md&labels=enhancement%2C+User+Story) and describes the basic problem or need to be addressed, a set of detailed goals to accomplish, any dependencies that must be addressed to start or complete the user story, and the criteria for acceptance of the contribution.

The goals in a user story will be bulleted, indicating that each goal can be worked on in parallel, or numbered, indicating that each goal must be worked on sequentially. Each goal will be assigned to one or more individuals to accomplish.

Note: A user story that is not part of a specific development sprint can still be worked on at any time by any OSCAL contributor. When a user story is not assigned to sprint, its status will not be tracked as part of our sprint management efforts, but when completed will still be considered as a possible contribution to the OSCAL project.

### Reporting User Story Status

When working on a goal that is part of a user story you will want to provide a periodic report on any progress that has been made until that goal has been completed. This status must be reported as a comment to the associated user story issue. For a user story that is part of an OSCAL development sprint, status reports will typically be made by close of business the day before the weekly OSCAL status meeting (typically held on Thursdays). Each OSCAL contributor will enter their own status update weekly indicating an estimated completion percentage against each goal to which they are assigned. Progress on goals will be tracked by the NIST OSCAL team and will be used to update the project cards for the current sprint.

When reporting status, please use the following comment template:

```
MM/DD/YYY - Sprint XX Progress Report

Goal: <goal text>
Progress: <a short comment on progress made since the last report>
% Complete: <a rough estimated percentage of the work completed>
Open Issues: <a list of issues encountered while addressing the goal>
```

When describing any open issues encountered use an "\@mention" of the individual who needs to respond to the issue. This will ensure that the individual is updated with this status. Please also raise any active, unresolved issues on the weekly status calls.

### Project Status

The project cards for each sprint will be in one of the following states:

-   "To do" - The user story has been assigned to the sprint, but work has not started.
-   "In progress" - Work has started on the user story, but development of the issue has not completed.
-   "Under review" - All goals for the user story have been completed and one or more pull requests have been submitted for all associated work. The NIST team will review the pull requests to ensure that all goals and acceptance criteria have been met.
-   "Done" - Once the contributed work has been reviewed and the pull request has been merged, the user story will be marked as "Done".

Note: A pull request must be submitted for all goals before an issue will be moved to the "under review" status. If any goals or acceptance criteria have not been met, then the user story will be commented on to provide feedback, and the issue will be returned to the "In progress" state.
