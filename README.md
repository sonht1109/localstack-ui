# LocalStack UI

A web UI for managing your local [LocalStack](https://localstack.cloud/) resources. 

Right now, it supports interacting with **S3** and **SQS** straight from your browser.

## Features

- **S3**: List, create, and delete buckets. Browse, upload, download, and delete objects.
- **SQS**: List, create, and delete queues. Send, view, and purge messages.

## Getting Started

Make sure you have a LocalStack instance running (usually on `localhost:4566`).

### Running with Docker (Recommended)

If you already have LocalStack running in Docker, you can easily spin up the UI alongside it:

```bash
docker-compose up -d --build
```

The UI will be available at [http://localhost:3007](http://localhost:3007).

### Running Locally

If you prefer to run it outside of Docker:

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser. It will automatically drop you into the S3 dashboard.

## Configuration

By default, the app assumes LocalStack is available at `http://localhost:4566`. If you need to point it somewhere else, just update your environment variables. 

Since it's connecting to LocalStack, dummy AWS credentials (like `test`/`test`) are perfectly fine.
