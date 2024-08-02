import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { GoFunction } from '@aws-cdk/aws-lambda-go-alpha'
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import path = require('path');
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CdkStack extends cdk.Stack {
  private goLambda: GoFunction
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    this.goLambda = new GoFunction(this, 'GoFunction', {
      entry: path.join(__dirname, '../../src/lambdas/go/test/main.go'),
      logRetention: RetentionDays.ONE_WEEK,
      functionName: 'GoFunction',
    })

  }
}
