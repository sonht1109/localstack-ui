import { S3Client } from '@aws-sdk/client-s3';
import { SQSClient } from '@aws-sdk/client-sqs';

export function getS3Client(endpoint: string, region: string = 'ap-southeast-1') {
  return new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
    forcePathStyle: true,
  });
}

export function getSQSClient(endpoint: string, region: string = 'ap-southeast-1') {
  return new SQSClient({
    endpoint,
    region,
    credentials: {
      accessKeyId: 'test',
      secretAccessKey: 'test',
    },
  });
}
