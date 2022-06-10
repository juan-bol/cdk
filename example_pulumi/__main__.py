"""An AWS Python Pulumi program"""

import pulumi
from pulumi_aws import s3
import pulumi_aws as aws
import hashlib

# Create an AWS resource (S3 Bucket)
bucket = s3.Bucket('my-bucket',
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


# iam_for_lambda = aws.iam.Role("iamForLambda", assume_role_policy="""{
#   "Version": "2012-10-17",
#   "Statement": [
#     {
#       "Action": "sts:AssumeRole",
#       "Principal": {
#         "Service": "lambda.amazonaws.com"
#       },
#       "Effect": "Allow",
#       "Sid": ""
#     }
#   ]
# }
# """)
# test_lambda = aws.lambda_.Function("testLambda",
#     code=pulumi.FileArchive("./resources/lambda.zip"),
#     role=iam_for_lambda.arn,
#     handler="index.lambda_handler",
#     runtime="python3.7"
# )
