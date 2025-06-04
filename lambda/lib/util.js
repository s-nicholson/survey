exports.makeResponse = (status, body, contentType = 'text/html') => {
    return {
        "statusCode": status,
        "body": typeof body == "object" ? JSON.stringify(body) : body,
        "headers": {
            'Content-Type': contentType,
        }
    };
};