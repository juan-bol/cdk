import * as path from "path";
import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import {
  aws_s3 as s3,
  aws_s3_deployment as s3Deployment,
  aws_dynamodb as dynamodb,
  aws_lambda as lambda,
  aws_apigateway as apigw,
} from "aws-cdk-lib";

export class ExampleTsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    //Static website

    const myBucket = new s3.Bucket(this, "my-static-website-bucket", {
      bucketName: "my-bucket-cdk",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      websiteIndexDocument: "index.html",
      autoDeleteObjects: true,
    });

    const deployment = new s3Deployment.BucketDeployment(
      this,
      "deployStaticWebsite",
      {
        sources: [
          s3Deployment.Source.asset("./resources", {
            exclude: ["**", "!index.html"],
          }),
        ],
        destinationBucket: myBucket,
        accessControl: s3.BucketAccessControl.PUBLIC_READ,
        contentType: "text/html",
        contentDisposition: "inline",
      }
    );

    // API Gateway with dynamoDB

    const greetingsTable = new dynamodb.Table(this, "GreetingsTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const saveHelloFunction = new lambda.Function(this, "SaveHelloFunction", {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "handler.saveHello",
      code: lambda.Code.fromAsset(path.resolve(__dirname, "../resources"), {
        exclude: ["**", "!handler.js"],
      }),
      environment: {
        GREETINGS_TABLE: greetingsTable.tableName,
      },
    });

    const getHelloFunction = new lambda.Function(this, "GetHelloFunction", {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: "handler.getHello",
      code: lambda.Code.fromAsset(path.resolve(__dirname, "../resources"), {
        exclude: ["**", "!handler.js"],
      }),
      environment: {
        GREETINGS_TABLE: greetingsTable.tableName,
      },
    });

    greetingsTable.grantReadWriteData(saveHelloFunction);
    greetingsTable.grantReadWriteData(getHelloFunction);

    const helloApi = new apigw.RestApi(this, "helloApi");

    helloApi.root
      .resourceForPath("hello")
      .addMethod("POST", new apigw.LambdaIntegration(saveHelloFunction));
    helloApi.root
      .resourceForPath("hello")
      .addMethod("GET", new apigw.LambdaIntegration(getHelloFunction));
  }
}
