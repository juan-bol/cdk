import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

const crypto = require("crypto");
const fs = require("fs");

//Static website

const myBucket = new aws.s3.Bucket("my-bucket", {
  bucket: "my-bucket-pulumi",
  website: {
    indexDocument: "index.html",
  },
});

const deployment = new aws.s3.BucketObject("deployStaticWebsite", {
  key: "index.html",
  bucket: myBucket.id,
  acl: "public-read",
  contentType: "text/html",
  source: new pulumi.asset.FileAsset("./resources/index.html"),
  etag: crypto
    .createHash("md5")
    .update(fs.readFileSync("./resources/index.html"))
    .digest("hex"),
});

export const bucketName = myBucket.websiteEndpoint;

// API Gateway with dynamoDB TODO

const greetingsTable = new aws.dynamodb.Table("basic-dynamodb-table", {
  attributes: [
    {
      name: "id",
      type: "S",
    },
  ],
  hashKey: "id",
  readCapacity: 1,
  writeCapacity: 1,
});

const iamForLambda = new aws.iam.Role("iamForLambda", {
  assumeRolePolicy: `{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Action": "sts:AssumeRole",
        "Principal": {
          "Service": "lambda.amazonaws.com"
        },
        "Effect": "Allow",
        "Sid": ""
      }
    ]
  }
`,
});

const policy = new aws.iam.Policy("policy", {
  path: "/",
  description: "My test policy",
  policy: greetingsTable.arn.apply((arn) =>
    JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Action: ["dynamodb:*"],
          Effect: "Allow",
          Resource: arn,
        },
      ],
    })
  ),
});

const policyAttach = new aws.iam.RolePolicyAttachment("lambdaPolicyAttach", {
  role: iamForLambda.name,
  policyArn: policy.arn,
});

let assetArchive = new pulumi.asset.AssetArchive({
  "handler.js": new pulumi.asset.FileAsset("./resources/handler.js"),
});

const saveHelloFunction = new aws.lambda.Function("SaveHelloFunction", {
  code: assetArchive,
  role: iamForLambda.arn,
  handler: "handler.saveHello",
  runtime: "nodejs14.x",
  environment: {
    variables: {
      GREETINGS_TABLE: greetingsTable.name,
    },
  },
});

const getHelloFunction = new aws.lambda.Function("GetHelloFunction", {
  code: assetArchive,
  role: iamForLambda.arn,
  handler: "handler.getHello",
  runtime: "nodejs14.x",
  environment: {
    variables: {
      GREETINGS_TABLE: greetingsTable.name,
    },
  },
});

const saveRoute: awsx.apigateway.EventHandlerRoute = {
  path: "/hello",
  method: "POST",
  eventHandler: saveHelloFunction,
};

const getRoute: awsx.apigateway.EventHandlerRoute = {
  path: "/hello",
  method: "GET",
  eventHandler: getHelloFunction,
};

const site = new awsx.apigateway.API("helloApi", {
  routes: [saveRoute, getRoute],
});

export const siteUrl = site.url;
