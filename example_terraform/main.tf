//Static website

resource "aws_s3_bucket" "example" {
  bucket = "terraform-bucket-example"
  website {
    index_document = "index.html"
  }

}

resource "aws_s3_bucket_object" "object" {
  key          = "index.html"
  bucket       = aws_s3_bucket.example.id
  acl          = "public-read"
  content_type = "text/html"
  source       = "./resources/index.html"
  etag         = filemd5("./resources/index.html")

}

output "bucket_endpoint" {
  value = format("http://%s", aws_s3_bucket.example.website_endpoint)
}

// API Gateway with dynamoDB TODO

resource "aws_dynamodb_table" "greetingsTable" {
  name           = "greetingsTable"
  hash_key       = "id"
  write_capacity = 1
  read_capacity  = 1
  attribute {
    name = "id"
    type = "S"
  }
}

resource "aws_iam_role" "iam_for_lambda" {
  name               = "iam_for_lambda"
  assume_role_policy = <<EOF
{
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
EOF
}

data "aws_iam_policy_document" "policy_doc" {
  version = "2012-10-17"
  statement {
    actions = [
      "dynamodb:BatchGetItem",
      "dynamodb:BatchWriteItem",
      "dynamodb:ConditionCheckItem",
      "dynamodb:DeleteItem",
      "dynamodb:DescribeTable",
      "dynamodb:GetItem",
      "dynamodb:GetRecords",
      "dynamodb:GetShardIterator",
      "dynamodb:PutItem",
      "dynamodb:Query",
      "dynamodb:Scan",
      "dynamodb:UpdateItem"
    ]
    effect = "Allow"
    resources = [
      "${aws_dynamodb_table.greetingsTable.arn}",
    ]
  }
}

resource "aws_iam_policy" "policy" {
  name        = "test-policy"
  description = "A test policy"
  policy      = data.aws_iam_policy_document.policy_doc.json
}

resource "aws_iam_role_policy_attachment" "policyAttach" {
  role       = aws_iam_role.iam_for_lambda.name
  policy_arn = aws_iam_policy.policy.arn
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "./resources/handler.js"
  output_path = "./resources/lambda.zip"
}

resource "aws_lambda_function" "saveHelloFunction" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "lambda_terraform_save"
  role             = aws_iam_role.iam_for_lambda.arn
  handler          = "handler.saveHello"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime          = "nodejs12.x"
  environment {
    variables = {
      GREETINGS_TABLE = aws_dynamodb_table.greetingsTable.name
    }
  }
}


resource "aws_lambda_function" "getHelloFunction" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "lambda_terraform_get"
  role             = aws_iam_role.iam_for_lambda.arn
  handler          = "handler.getHello"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime          = "nodejs12.x"
  environment {
    variables = {
      GREETINGS_TABLE = aws_dynamodb_table.greetingsTable.name
    }
  }
}

resource "aws_api_gateway_rest_api" "api" {
  name = "helloApi"
}

resource "aws_api_gateway_resource" "resource" {
  path_part   = "hello"
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  rest_api_id = aws_api_gateway_rest_api.api.id
}

resource "aws_api_gateway_method" "post_method" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.resource.id
  http_method   = "POST"
  authorization = "NONE"
  api_key_required = false
}

resource "aws_api_gateway_method" "get_method" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.resource.id
  http_method   = "GET"
  authorization = "NONE"
  api_key_required = false
}


resource "aws_api_gateway_integration" "integration_post" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.resource.id
  http_method             = aws_api_gateway_method.post_method.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.saveHelloFunction.invoke_arn
}

resource "aws_api_gateway_integration" "integration_get" {
  rest_api_id             = aws_api_gateway_rest_api.api.id
  resource_id             = aws_api_gateway_resource.resource.id
  http_method             = aws_api_gateway_method.get_method.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.getHelloFunction.invoke_arn
}

resource "aws_lambda_permission" "apigw_lambda_permission_post" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.saveHelloFunction.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn = "arn:aws:execute-api:${var.myregion}:${var.accountId}:${aws_api_gateway_rest_api.api.id}/*/${aws_api_gateway_integration.integration_post.integration_http_method}${aws_api_gateway_resource.resource.path}"
}

resource "aws_lambda_permission" "apigw_lambda_permission_get" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.getHelloFunction.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn = "arn:aws:execute-api:${var.myregion}:${var.accountId}:${aws_api_gateway_rest_api.api.id}/*/*/*"
}

resource "aws_api_gateway_deployment" "deployment" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  depends_on = [
    aws_api_gateway_integration.integration_post,
    aws_api_gateway_integration.integration_get
  ]
}

resource "aws_api_gateway_stage" "stage" {
  deployment_id = aws_api_gateway_deployment.deployment.id
  rest_api_id = aws_api_gateway_rest_api.api.id
  stage_name = "prod"
}

output "site_url" {
  value = format("%s%s/%s",aws_api_gateway_deployment.deployment.invoke_url,aws_api_gateway_stage.stage.stage_name, aws_api_gateway_resource.resource.path_part)
}
