const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3 = new S3Client();

exports.getResponseFileUrl = async (filename) => {
  const expiresInSeconds = 60 * 5; // e.g., 5 minutes

  const command = new GetObjectCommand({
      Bucket: process.env.BUCKET,
      Key: filename
  });

  const signedUrl = await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
  return signedUrl;
};

exports.readResponseFile = async (key) => {
  try {
      const command = new GetObjectCommand({
          Bucket: process.env.BUCKET,
          Key: key
      });
      const response = await s3.send(command);
      const responsBody = await response.Body.transformToString();
      return JSON.parse(responsBody);
  } catch (err) {
      return [];
  }
}

exports.writeResponseFile = async (key, responses) => {
  const command = new PutObjectCommand({
      Bucket: process.env.BUCKET,
      Key: key,
      Body: JSON.stringify(responses)
  });

  const response = await s3.send(command);
  return response;
}