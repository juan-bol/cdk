import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

const crypto = require('crypto');
const fs = require('fs');


//Static website

const myBucket = new aws.s3.Bucket("my-bucket", {
    bucket: "my-bucket-pulumi",
    website: {
        indexDocument: "index.html",
    }
});

const exampleBucketObject = new aws.s3.BucketObject("my-static-website-bucket", {
    key: "index.html",
    bucket: myBucket.id,
    acl:'public-read',
    contentType: 'text/html',
    source: new pulumi.asset.FileAsset("./resources/index.html"),
    etag: crypto.createHash('md5').update(fs.readFileSync('./resources/index.html')).digest('hex'),
});

// Export the name of the bucket
export const bucketName = myBucket.websiteEndpoint;

// API Gateway with dynamoDB TODO

