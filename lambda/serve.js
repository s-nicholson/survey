const { makeResponse, basicPage, questions } = require("./lib/util");
const { validateParams } = require("./lib/params");
const { getSurvey } = require("./lib/db");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");

const s3 = new S3Client();

exports.handler = async lambdaEvent => {
    try {
        const { id, pin } = validateParams(lambdaEvent.queryStringParameters);

        // Fetch survey data from db
        const surveyDefinition = await getSurvey(id);
        if (!surveyDefinition || pin != surveyDefinition.pin) {
            throw new Error("Invalid params");
        }

        switch (lambdaEvent.path) {
            case "/survey":
                return makeResponse(200, surveyContent(surveyDefinition));
            case "/results":
                const dataUrl = await getS3Url(surveyDefinition.filename);
                return makeResponse(200, resultsContent(surveyDefinition, dataUrl));
        }
    } catch (e) {
        return makeResponse(401, basicPage(`Error`, `
                <h1>Oops</h1>
                <p>${e.message}</p>
            `)
        );
    }
}

function surveyContent(surveyDefinition) {
    const description = surveyDefinition.description
        ? `
        <div class="row">
            <p>${surveyDefinition.description}</p>
        </div>
        `
        : "";
    return basicPage(surveyDefinition.name, `
        <div class="row">
            <h1>${surveyDefinition.name}</h1>
        </div>
        ${description}
        <div class="row">
            <form id="questions">
                ${questions(surveyDefinition.questions)}
                <button type="button"
                    class="btn btn-primary"
                    onclick="send()">Submit</button>
            </form>
        </div>
        <script>
            function send() {
                let answersObj = {};
                let form = document.getElementById("questions");
                let answers = new FormData(form);
                answers.forEach((value, key) => (answersObj[key] = value));
                
                let params = new URL(document.location.toString()).searchParams;
                fetch("/prod/response", {
                    method: "POST",
                    body: JSON.stringify(
                        {
                            "surveyId": params.get("surveyId"),
                            "pin": params.get("pin"),
                            "response": answersObj
                        }
                    ),
                    headers: {
                        "Content-type": "application/json; charset=UTF-8"
                    }
                })
                .then(response=>response.json())
                .then(data => {
                    let header = "<h1>" + data.header + "</h1>";
                    let message = "<p>" + data.message + "</p>"
                    
                    let newContent = header + message;
                    document.getElementById("container").innerHTML = newContent;
                })
                .catch(err => {
                    alert("Oops. That didn't work. Please try again.");
                    console.log(err);
                });
            }
        </script>
    `);
}

function resultsContent(surveyDefinition, dataUrl) {
    const titleMap = {};
    surveyDefinition.questions.forEach(question => {
        titleMap[question.id] = question.label;
    });

    const description = surveyDefinition.resultsDescription
    ? `
    <div class="row">
        <p>${surveyDefinition.resultsDescription}</p>
    </div>
    `
    : "";

    return `
    <html>
        <head>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/css/bootstrap.min.css"
                integrity="sha512-jnSuA4Ss2PkkikSOLtYs8BlYIeeIK1h99ty4YfvRPAlzr377vr3CXDb7sb7eEEBYjDtcYj+AjBH3FLv5uSJuXg=="
                crossorigin="anonymous" referrerpolicy="no-referrer" />
            
            <!-- Scripts -->
            <script type="text/javascript"
                src="https://cdnjs.cloudflare.com/ajax/libs/crossfilter2/1.5.4/crossfilter.min.js"></script>
            <script type="text/javascript"
                src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"></script>
            <script type="text/javascript"
                src="https://cdnjs.cloudflare.com/ajax/libs/dc/4.2.7/dc.min.js"></script>
            
            <script type="text/javascript">
                const titles = ${JSON.stringify(titleMap)};
                const charts = {};
                window.addEventListener('load', function() {
                    'use strict';

                    // Fetch using dataUrl
                    fetch("${dataUrl}")
                    .then(response=>response.json())
                    .then(data => {
                        const cf = crossfilter(data);
                        const all = cf.groupAll();

                        // Define dimensions
                        const allKeys = getAllKeys(data);
                        const dimensions = getDimensions(cf, allKeys);

                        // Define charts

                        Object.keys(dimensions).forEach(k => {
                            const container = document.getElementById("container");

                            const div = document.createElement("div");
                            div.innerHTML = (\`
                                <div id="\${k}Chart" class="dc-chart">
                                    <strong>\${titles[k]}</strong>
                                    <a class="reset" href="javascript:charts.\${k}.filterAll();dc.redrawAll();"
                                        style="display: none;">reset</a>
                                    <div class="clearfix">
                                    </div>
                                </div>
                            \`);
                            container.appendChild(div);

                            const grp = dimensions[k].group();

                            charts[k] = dc.pieChart(\`#\${k}Chart\`)
                                .radius(80)
                                .dimension(dimensions[k])
                                .group(grp)
                                .ordinalColors(d3.schemeTableau10)
                                .legend(new dc.Legend()
                                    .y(40)
                                    .gap(5));
                        });

                        const count = new dc.DataCount('.dc-data-count')
                            .crossfilter(cf)
                            .groupAll(all)
                            .html({
                                some: '<strong>%filter-count</strong> selected out of <strong>%total-count</strong> records' +
                                    ' | <a href="javascript:dc.filterAll(); dc.renderAll();">Reset All</a>',
                                all: 'All <strong>%total-count</strong> records selected. Please click on the graphs to apply filters.'
                            });

                        dc.renderAll();

                        // Helpers
                        function getAllKeys(data) {
                            const keys = new Set();
                            data.forEach(e => 
                                Object.keys(e)
                                .forEach(k => keys.add(k)));
                            return keys;
                        }

                        function getDimensions(cf, keys) {
                            const dimensions = {};

                            keys.forEach(k => {
                                dimensions[k] = cf.dimension(d => d[k] || "Unknown");
                            });

                            return dimensions;
                        }
                    })
                    .catch(err => {
                        document.getElementById("container").innerHTML = "<h1>No data just yet.</h1><p>It may take a few minutes for data to become available.</p>";
                    });
                });
            </script>
            <title>${surveyDefinition.name}</title>
        </head>
        <body>
            <div id="container" class="container">
                <div class="row">
                    <h1>${surveyDefinition.name}</h1>
                </div>
                ${description}
                <div class="row">
                    <div class="dc-data-count dc-chart">
                    </div>
                </div>
            </div>
        </body>
    </html>
    `;
}

async function getS3Url(filename) {
    const expiresInSeconds = 60 * 5; // e.g., 5 minutes

    const command = new GetObjectCommand({
        Bucket: process.env.BUCKET,
        Key: filename
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
    return signedUrl;
};