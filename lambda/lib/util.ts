export const makeResponse = (status: number, body: string | object, contentType = 'text/html') => {
    return {
        "statusCode": status,
        "body": typeof body == "object" ? JSON.stringify(body) : body,
        "headers": {
            'Content-Type': contentType,
        }
    };
};