# O.D.D. Example Frontend

This project is meant to be a "minimal" example of an application consuming `oscal-deep-diff` as a library

## Usage

The project can be tested using the `npm run start` target.
Note that in order to run this project on a local (unreleased) version of OSCAL-deep-diff, you must do the following:

```bash
# Starting from this directory
# Navigate to the parent "OSCAL-deep-diff directory
pushd ../../
# Create a link for oscal-deep-diff with NPM link
npm link
# Return to this directory
popd
# Link this project's OSCAL-deep-diff dependency to the link you created in the last step
npm link @oscal/oscal-deep-diff
```
