import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { GoFunction } from '@aws-cdk/aws-lambda-go-alpha'
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import * as path from 'path';
import { Deployment, EndpointType, JsonSchemaType, LambdaIntegration, MethodLoggingLevel, RestApi, Stage, UsagePlan } from 'aws-cdk-lib/aws-apigateway';
import { Size } from 'aws-cdk-lib';
import { AttributeType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Effect, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';

export class CdkStack extends cdk.Stack {
  private goLambda: GoFunction
  private nodeLambda: NodejsFunction
  private restApi: RestApi
  private dynamoTable: Table
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    this.dynamoTable = new Table(this, 'DynamoTable', {
      tableName: 'SampleTable',
      partitionKey:{
        name: 'id',
        type: AttributeType.STRING
      },
      sortKey:{
        name: 'name',
        type: AttributeType.STRING
      }
    })
    this.goLambda = new GoFunction(this, 'GoFunction', {
      entry: path.join(__dirname, '../../src/lambdas/go/getObject/main.go'),
      logRetention: RetentionDays.ONE_WEEK,
      functionName: 'GoFunction',
      timeout: cdk.Duration.seconds(60),
    })
    this.goLambda.role?.addToPrincipalPolicy(new PolicyStatement({
      actions: ['dynamodb:*'],
      resources: [this.dynamoTable.tableArn],
      effect: Effect.ALLOW
    }))

    this.nodeLambda = new NodejsFunction(this, 'NodeFunction', {
      entry: path.join(__dirname, '../../src/lambdas/node/postObject/index.ts'),
      logRetention: RetentionDays.ONE_WEEK,
      functionName: 'NodeFunction',
      handler: 'handler',
      timeout: cdk.Duration.seconds(60),
    })
    this.nodeLambda.role?.addToPrincipalPolicy(new PolicyStatement({
      actions: ['dynamodb:*'],
      resources: [this.dynamoTable.tableArn],
      effect: Effect.ALLOW
    }))

    const apiPrincipal = new ServicePrincipal('apigateway.amazonaws.com')

    const apiInvokeRole = new Role(this, 'apiInvokeRole', {
      assumedBy: apiPrincipal
    })
    apiInvokeRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        resources: [
          this.goLambda.functionArn,
          this.nodeLambda.functionArn
        ],
        actions: ['lambda:InvokeFunction']
      })
    )

    this.restApi = new RestApi(this, 'RestApi', {
      restApiName: 'RestApi',
      retainDeployments: false,
      endpointConfiguration: {
        types: [EndpointType.EDGE]
      },
      minCompressionSize: Size.bytes(1000)
    })
    const apiDeployment = new Deployment(this, 'Deployment', {
      api: this.restApi
    })
    const stage = new Stage(this, 'ApiStage', {
      deployment: apiDeployment,
      metricsEnabled: true,
      loggingLevel: MethodLoggingLevel.INFO,
      stageName: 'v1'
    })
    new UsagePlan(this, 'UsagePlan', {
      apiStages: [{ api: this.restApi, stage: stage }],
    })
    const goResource = this.restApi.root.addResource('go')
    const nodeResource = this.restApi.root.addResource('node')

    const fetchObjectRequest = this.restApi.addModel('FetchObjectRequest', {
      modelName: 'FetchObjectRequest',
      contentType: 'application/json',
      schema: {
        type: JsonSchemaType.OBJECT,
        properties: {
          id: {
            type: JsonSchemaType.STRING,
          },
          name:{
            type: JsonSchemaType.STRING
          }

        },
        description: 'FetchObjectRequest model, expects an object id',
        required: ['id','name']
      }
    })
    goResource.addMethod(
      'POST',
      new LambdaIntegration(this.goLambda, {
        proxy: true,
        credentialsRole: apiInvokeRole
      }),
      {
        apiKeyRequired: true,
        requestModels: {
          'application/json': fetchObjectRequest
        }
      }
    )
    nodeResource.addMethod(
      'POST',
      new LambdaIntegration(this.nodeLambda, {
        proxy: true,
        credentialsRole: apiInvokeRole
      }),
      {
        apiKeyRequired: true,
      }
    )
  }
}
