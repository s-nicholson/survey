import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client();

export const getResponseFileUrl = async (filename: string): Promise<string> => {
  const expiresInSeconds = 60 * 5; // e.g., 5 minutes

  const command = new GetObjectCommand({
      Bucket: process.env.BUCKET,
      Key: filename
  });

  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
  return signedUrl;
};

export const readResponseFile = async (key: string): Promise<any[]> => {
  try {
      const command = new GetObjectCommand({
          Bucket: process.env.BUCKET,
          Key: key
      });
      const response = await s3Client.send(command);
      const responsBody = await response.Body!.transformToString();
      return JSON.parse(responsBody);
  } catch (err) {
      return [];
  }
}

export const writeResponseFile = async (key: string, responses: object[]): Promise<any> => {
  const command = new PutObjectCommand({
      Bucket: process.env.BUCKET,
      Key: key,
      Body: JSON.stringify(responses)
  });

  const response = await s3Client.send(command);
  return response;
}