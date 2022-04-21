import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap';
import './main.css';

import YAML from 'yaml';
import { Comparator, parseComparatorConfig, performIntermediateComparison, buildSelection, trackRawObject } from '@oscal/oscal-deep-diff';

const statusDiv = document.getElementById("status_space");    
const outputDiv = document.getElementById("output_space");
const leftFileInput = document.getElementById("left_finput");
const rightFileInput = document.getElementById("right_finput");
const configInput = document.getElementById("config_input");
const intOutCheck = document.getElementById("intoutput_checkbox")
const submitButton = document.getElementById("submit_btn");

function status(message, type='danger') {
    return `<div class="alert alert-${type}" role="alert">${message}</div>`;
}

function validateFileInput() {
    if (leftFileInput.files.length === 0 || rightFileInput.files.length === 0) {
        let errorText = "Left and right documents missing";
        if (leftFileInput.files.length !== 0) {
            errorText = "Right document missing";
        } else if (rightFileInput.files.length !== 0) {
            errorText = "Left document missing";
        }
        statusDiv.innerHTML += status(errorText);
        return false;
    }
    return true;
}

function validateComparatorConfig() {
    let rawConfig = {};
    try {
        rawConfig = YAML.parse(configInput.value);
    } catch (error) {
        statusDiv.innerHTML += status(`Failed to parse YAML: ${error}`);
        return false;
    }

    try {
        parseComparatorConfig(rawConfig);
    } catch (error) {
        statusDiv.innerHTML += status(`Failed to marshal configuration: ${error}`);
        return false;
    }

    return true;
}

function validate() {
    statusDiv.innerHTML = "";
    const valid = validateFileInput() && validateComparatorConfig();
    submitButton.disabled = !valid;
    return valid;
}

function readFile(f) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (reader.result) {
                resolve(JSON.parse(reader.result.toString()));
            } else {
                reject();
            }
        }
        if (f !== undefined) {
            reader.readAsText(f);
        }
    });
}

async function diff() {
    if (!validate()) {
        throw new Error("Validation failed");
    }

    submitButton.disabled = true;

    outputDiv.innerHTML = status("Starting comparison", "primary");

    
    try {
        const config = parseComparatorConfig(YAML.parse(configInput.value));
        const comparator = new Comparator(config);
    
        const left = await readFile(leftFileInput.files[0]);
        const right = await readFile(rightFileInput.files[0]);

        const comparison = comparator.compare(left, leftFileInput.files[0].name, right, rightFileInput.files[0].name);
        
        outputDiv.innerHTML = status("Comparison finished!", "success");

        if (intOutCheck.checked) {
            const selectionResults = buildSelection(comparison, "controls");
            const intermediateOutput = performIntermediateComparison(
                selectionResults,
                trackRawObject('', left),
                trackRawObject('', right),
            );

            // create output table
            const table = document.createElement("table");
            table.className = "table";
            table.innerHTML = `<thead>
                <tr>
                    <th scope="col">left</th>
                    <th scope="col">right</th>
                    <th scope="col">status</th>
                    <th scope="col"># of changes</th>
                </tr>
            </thead>`;
            outputDiv.appendChild(table);

            const tbody = document.createElement("tbody");
            table.appendChild(tbody);

            intermediateOutput.forEach((row) => {
                tbody.innerHTML += `<tr>
                    <td>${row.leftIdentifiers?.['id'] ?? "unknown"}</td>
                    <td>${row.rightIdentifiers?.['id'] ?? "unknown"}</td>
                    <td>${row.status}</td>
                    <td>${row.changes?.length ?? 0}</td>
                </tr>`;
            });
        } else {
            outputDiv.innerHTML += JSON.stringify(comparison, null, 2);
        }
    } catch (error) {
        outputDiv.innerHTML += status(`Comparison failed: ${error}`);
    } finally {
        submitButton.disabled = false;
    }
}

// expose validate and diff functions to html
window.validate = validate;
window.diff = diff;

validate();
