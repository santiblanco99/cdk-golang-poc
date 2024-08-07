package main

import (
	"context"
	"errors"
	"log"

	"encoding/json"
	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

var (
	// ErrNameNotProvided is thrown when a name is not provided
	ErrNameNotProvided = errors.New("no name was provided in the HTTP body")
)

type apiRequestBody struct {
	Id   string `json:"id"`
	Name string `json:"name"`
}

func Handler(request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {

	log.Print("Processing Lambda request:", request)

	// If no name is provided in the HTTP request body, throw an error
	if len(request.Body) < 1 {
		return events.APIGatewayProxyResponse{}, ErrNameNotProvided
	}
	parsedBody := apiRequestBody{}
	parseError := json.Unmarshal([]byte(request.Body), &parsedBody)
	if parseError != nil {
		return events.APIGatewayProxyResponse{}, parseError
	}
	cfg, cfgErr := config.LoadDefaultConfig(
		context.Background(),
		config.WithRegion("us-east-1"),
	)
	if cfgErr != nil {
		log.Print("cfgErr:", cfgErr)
		return events.APIGatewayProxyResponse{}, cfgErr
	}

	dbClient := dynamodb.NewFromConfig(cfg)

	getItemInput := &dynamodb.GetItemInput{
		TableName: aws.String("SampleTable"),
		Key: map[string]types.AttributeValue{
			"id":   &types.AttributeValueMemberS{Value: parsedBody.Id},
			"name": &types.AttributeValueMemberS{Value: parsedBody.Name},
		},
	}
	log.Print("getItemInput Key:", (*getItemInput).Key)
	response, dbError := dbClient.GetItem(context.TODO(), getItemInput)
	if dbError != nil {
		log.Print("dbError:", dbError)
		return events.APIGatewayProxyResponse{}, dbError
	}
	id := response.Item["id"].(*types.AttributeValueMemberS).Value
	name := response.Item["name"].(*types.AttributeValueMemberS).Value

	return events.APIGatewayProxyResponse{
		Body:       "Hello " + id + " " + name,
		StatusCode: 200,
	}, nil

}

func main() {
	lambda.Start(Handler)
}
