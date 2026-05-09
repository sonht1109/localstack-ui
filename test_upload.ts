import { S3Client, PutObjectCommand, CreateBucketCommand } from '@aws-sdk/client-s3';

const client = new S3Client({
  endpoint: 'http://localhost:3000',
  region: 'ap-southeast-1',
  credentials: { accessKeyId: '000000000000', secretAccessKey: 'test' },
  forcePathStyle: true,
});

async function run() {
  try {
    try {
      await client.send(new CreateBucketCommand({ Bucket: 'my-test-bucket' }));
    } catch(e) {}
    
    await client.send(new PutObjectCommand({
      Bucket: 'my-test-bucket',
      Key: 'test.csv',
      Body: Buffer.from('a,b,c\n1,2,3'),
      ContentType: 'text/csv',
    }));
    console.log('Success');
  } catch (e) {
    console.error(e);
  }
}
run();