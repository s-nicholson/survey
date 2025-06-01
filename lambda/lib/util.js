exports.makeResponse = (status, body, contentType = 'text/html') => {
    return {
        "statusCode": status,
        "body": body,
        "headers": {
            'Content-Type': contentType,
        }
    };
};

exports.basicPage = (title, body) => {
    return `
    <html>
        <head>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.3/css/bootstrap.min.css"
                integrity="sha512-jnSuA4Ss2PkkikSOLtYs8BlYIeeIK1h99ty4YfvRPAlzr377vr3CXDb7sb7eEEBYjDtcYj+AjBH3FLv5uSJuXg=="
                crossorigin="anonymous" referrerpolicy="no-referrer" />
            <title>${title}</title>
        </head>
        <body>
            <div id="container" class="container">
                ${body}
            </div>
        </body>
    </html>
    `;
};

exports.questions = (questionList) => {
    const questionHtml = [];

    questionList.forEach(q => {
        questionHtml.push(question(q.id, q.label, q.options, q.defaultVal));
    });

    return `${questionHtml.join("")}`;
};

const question = (id, label, options, defaultVal) => {
    const optionHtml = [];

    if (!defaultVal) {
        defaultVal = options[0];
    }
    options.forEach(opt => {
        const selected = (opt == defaultVal) ? "selected" : "";
        optionHtml.push(`<option ${selected}>${opt}</option>`);
    });

    return `
    <div class="form-group">
        <label for="${id}">${label}?</label>
        <select class="form-control" id="${id}" name="${id}">
            ${optionHtml.join("")}
        </select>
    </div>
    `;
};