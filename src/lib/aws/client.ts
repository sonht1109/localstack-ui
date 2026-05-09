import { S3Client } from '@aws-sdk/client-s3';
import { SQSClient } from '@aws-sdk/client-sqs';

const formatEndpoint = (endpoint: string) => endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;

export function getS3Client(endpoint: string, region: string = 'ap-southeast-1', accountId: string = '000000000000') {
  return new S3Client({
    endpoint: formatEndpoint(endpoint),
    region,
    credentials: {
      accessKeyId: accountId,
      secretAccessKey: 'test',
    },
    forcePathStyle: true,
  });
}

export function getSQSClient(endpoint: string, region: string = 'ap-southeast-1', accountId: string = '000000000000') {
  return new SQSClient({
    endpoint: formatEndpoint(endpoint),
    region,
    credentials: {
      accessKeyId: accountId,
      secretAccessKey: 'test',
    },
  });
}
