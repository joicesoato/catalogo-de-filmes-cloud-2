const crypto = require("crypto");

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hmac(key, value, encoding) {
  return crypto.createHmac("sha256", key).update(value).digest(encoding);
}

function encodePath(path) {
  return path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function normalizeEndpoint(value) {
  return String(value || "http://minio:9000").replace(/\/$/, "");
}

function createS3Config() {
  const endpoint = normalizeEndpoint(process.env.MINIO_ENDPOINT);

  const parsed = new URL(endpoint);

  return {
    endpoint,
    hostname: parsed.host,
    protocol: parsed.protocol,
    region: process.env.MINIO_REGION || "us-east-1",
    accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
    secretKey: process.env.MINIO_SECRET_KEY || "minioadmin",
    bucket: process.env.MINIO_BUCKET || "profile-photos"
  };
}

async function s3Request(
  method,
  objectKey = "",
  body = null,
  extraHeaders = {}
) {
  const config = createS3Config();

  const now = new Date();

  const amzDate = now
    .toISOString()
    .replace(/[:-]|\.\d{3}/g, "");

  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = sha256(body || "");

  const bucketPath = `/${encodeURIComponent(config.bucket)}`;

  const objectPath = objectKey
    ? `/${encodePath(objectKey)}`
    : "";

  const canonicalUri = `${bucketPath}${objectPath}`;

  const headers = {
    host: config.hostname,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    ...extraHeaders
  };

  const signedHeaders = Object.keys(headers)
    .map((key) => key.toLowerCase())
    .sort();

  const canonicalHeaders = signedHeaders
    .map(
      (key) =>
        `${key}:${String(headers[key]).trim()}\n`
    )
    .join("");

  const canonicalRequest = [
    method,
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders.join(";"),
    payloadHash
  ].join("\n");

  const credentialScope =
    `${dateStamp}/${config.region}/s3/aws4_request`;

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256(canonicalRequest)
  ].join("\n");

  const kDate = hmac(
    `AWS4${config.secretKey}`,
    dateStamp
  );

  const kRegion = hmac(
    kDate,
    config.region
  );

  const kService = hmac(
    kRegion,
    "s3"
  );

  const kSigning = hmac(
    kService,
    "aws4_request"
  );

  const signature = hmac(
    kSigning,
    stringToSign,
    "hex"
  );

  const authorization =
    `AWS4-HMAC-SHA256 ` +
    `Credential=${config.accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders.join(";")}, ` +
    `Signature=${signature}`;

  const requestHeaders = {
    ...headers,
    Authorization: authorization
  };

  return fetch(
    `${config.endpoint}${canonicalUri}`,
    {
      method,
      headers: requestHeaders,
      body: body === null ? undefined : body
    }
  );
}

async function ensureBucket() {
  const response = await s3Request("PUT");

  if (
    response.ok ||
    response.status === 409
  ) {
    return;
  }

  const detail = await response.text();

  throw new Error(
    `Falha ao criar/verificar bucket do MinIO (${response.status}): ${detail.slice(0, 300)}`
  );
}

async function uploadObject(
  objectKey,
  buffer,
  contentType
) {
  await ensureBucket();

  const response = await s3Request(
    "PUT",
    objectKey,
    buffer,
    {
      "content-type": contentType,
      "content-length": String(buffer.length)
    }
  );

  if (!response.ok) {
    const detail = await response.text();

    throw new Error(
      `Falha ao enviar objeto para o MinIO (${response.status}): ${detail.slice(0, 300)}`
    );
  }
}

async function deleteObject(objectKey) {
  const response = await s3Request(
    "DELETE",
    objectKey
  );

  if (
    !response.ok &&
    response.status !== 404
  ) {
    const detail = await response.text();

    throw new Error(
      `Falha ao remover objeto do MinIO (${response.status}): ${detail.slice(0, 300)}`
    );
  }
}

async function getObject(objectKey) {
  const response = await s3Request(
    "GET",
    objectKey
  );

  if (!response.ok) {
    const detail = await response.text();

    throw new Error(
      `Falha ao buscar objeto do MinIO (${response.status}): ${detail.slice(0, 300)}`
    );
  }

  return response;
}

async function checkMinio() {
  const config = createS3Config();

  const response = await fetch(
    `${config.endpoint}/minio/health/live`,
    {
      signal: AbortSignal.timeout(2000)
    }
  );

  return response.ok;
}

module.exports = {
  uploadObject,
  deleteObject,
  getObject,
  checkMinio,
  ensureBucket
};