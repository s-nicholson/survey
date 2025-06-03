exports.makeResponse = (status, body, contentType = 'text/html') => {
    return {
        "statusCode": status,
        "body": typeof body == "object" ? JSON.stringify(body) : body,
        "headers": {
            'Content-Type': contentType,
        }
    };
};

exports.validateParams = (params) => {
    if (!params || !params.surveyId || !params.pin) {
        throw new Error("Missing params");
    }

    return { id: params.surveyId, pin: params.pin };
};