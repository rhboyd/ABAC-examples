from aws_cdk import (
    aws_apigateway as apigw,
    core
)


class APIStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)
        pass