#!/usr/bin/env python3

from aws_cdk import core

from src.apigateway.apigw_stack import APIStack


app = core.App()
APIStack(app, "ApiGatewayStack", env={'region': 'us-east-2', 'account':''})
# LambdaStack(app, "LambdaStack", env={'region': 'us-west-2', 'account':'484719295968'})

app.synth()
