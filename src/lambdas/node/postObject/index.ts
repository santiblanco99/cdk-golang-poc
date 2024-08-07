import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient, PutItemCommand, PutItemCommandInput } from "@aws-sdk/client-dynamodb";
interface BodyRequest {
    name: string;
    id: string;
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    console.log("event:", event);
    const body = JSON.parse(event.body || "{}") as BodyRequest;

    const client = new DynamoDBClient();
    const input: PutItemCommandInput = { // PutItemInput
      TableName: "SampleTable", // required
      Item: {
        id: { S: body.id },
        name: { S: body.name },
      }
    };
    const command = new PutItemCommand(input);
    const response = await client.send(command);
    console.log("response:", response);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Object created successfully", response: response }),
    };

  } catch (error) {
    console.log("error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error", error: error }),
    };
  }

}