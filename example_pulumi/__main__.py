"""An AWS Python Pulumi program"""

import pulumi
from pulumi_aws import s3
import pulumi_aws as aws
import hashlib

# Create an AWS resource (S3 Bucket)
bucket = s3.Bucket('my-bucket',
    bucket= "my-bucket-cdk-py",
    website=s3.BucketWebsiteArgs(
        index_document="index.html",
    ))

bucketObject = s3.BucketObject(
    'index.html',
    bucket=bucket.id,
    acl='public-read',
    content_type='text/html',
    source=pulumi.FileAsset('./resources/index.html'),
    etag=hashlib.md5(open('./resources/index.html','rb').read()).hexdigest()
)

# Export the name of the bucket endpoint
pulumi.export('bucket_endpoint', pulumi.Output.concat('http://', bucket.website_endpoint))
