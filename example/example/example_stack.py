from aws_cdk import (
    # Duration,
    Stack,
    aws_lambda as lambda_,
    aws_s3 as s3,
    aws_s3_deployment as s3deploy,
    CfnOutput
)
from constructs import Construct

class ExampleStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # self.create_lambda("MyLambdaUpdate")
        self.create_s3("MyBucket")

    def create_lambda(self, lambdaName):

        with open("resources/lambda.py", encoding="utf8") as fp:
            handler_code = fp.read()

        lambda_.Function(self, lambdaName,
            code=lambda_.InlineCode(handler_code),
            handler="index.lambda_handler",
            runtime=lambda_.Runtime.PYTHON_3_7
        )
    
    def create_s3(self, s3_name):
        bucket = s3.Bucket(self, "MyFirstBucket", 
            website_index_document= 'index.html'
        )
        s3deploy.BucketDeployment(self, "DeployWebsite",
            sources=[s3deploy.Source.asset("./resources")],
            destination_bucket=bucket,
            content_type='text/html'
        )
        # CfnOutput(self, "bucket_endpoint", value=bucket.bucketArn)
        
