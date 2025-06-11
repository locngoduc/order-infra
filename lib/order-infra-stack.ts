import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import * as sfnTasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';

export class OrderInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //VPC Configuration
    const vpcProps: ec2.VpcProps = {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      maxAzs: 3, // This means that the VPC will have 3 Availability Zones
      subnetConfiguration:[
        { 
          name: 'practice-public-subnet',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24, // This means that the subnet will have 2^32 - 2^24 = 256 IP addresses
        },
        {
          name: 'practice-private-subnet',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24, // This means that the subnet will have 2^32 - 2^24 = 256 IP addresses
        },
      ],
    }
    const vpc = new ec2.Vpc(this, 'practice-vpc-id', vpcProps);

    //Security Group Configuration
    const securityGroupProps: ec2.SecurityGroupProps = {
      allowAllOutbound: true,
      vpc,
    }
    const securityGroup = new ec2.SecurityGroup(this, 'practice-security-group-id', securityGroupProps);

    //EC2 Configuration
    const ec2Props: ec2.InstanceProps = {
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      securityGroup: securityGroup,
    }
    const ec2Instance = new ec2.Instance(this, 'practice-ec2-id', ec2Props);

    //S3 Bucket Configuration
    const s3Props: s3.BucketProps = {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    }
    const s3Bucket = new s3.Bucket(this, 'practice-s3-bucket-id', s3Props);

    // CloudWatch Log Groups for comprehensive logging
    const orderProcessorLogGroup = new logs.LogGroup(this, 'practice-order-processor-log-group', {
      logGroupName: '/aws/lambda/practice-order-processor-function',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const s3StorageLogGroup = new logs.LogGroup(this, 'practice-s3-storage-log-group', {
      logGroupName: '/aws/lambda/practice-s3-storage-function',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const apiLambdaLogGroup = new logs.LogGroup(this, 'practice-api-lambda-log-group', {
      logGroupName: '/aws/lambda/practice-api-lambda-function',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const stepFunctionsLogGroup = new logs.LogGroup(this, 'practice-stepfunctions-log-group', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Lambda Function Configuration for Step Functions
    const orderProcessorFunction = new lambda.Function(this, 'practice-order-processor-function-id', {
      functionName: 'practice-order-processor-function',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          // Simulate order processing logic
          const orderData = {
            orderId: event.orderId || 'order-' + Date.now(),
            customerName: event.customerName || 'Unknown Customer',
            items: event.items || [],
            totalAmount: event.totalAmount || 0,
            status: 'processed',
            timestamp: new Date().toISOString(),
            processedBy: 'order-processor-lambda',
            ...event
          };
          
          return {
            statusCode: 200,
            body: orderData
          };
        };
      `),
      timeout: cdk.Duration.seconds(30),
      logGroup: orderProcessorLogGroup,
    });

    // Grant Lambda function access to S3 bucket
    s3Bucket.grantReadWrite(orderProcessorFunction);

    // Additional Lambda Functions for Parallel Processing
    
    // Inventory Check Lambda Function
    const inventoryCheckFunction = new lambda.Function(this, 'practice-inventory-check-function-id', {
      functionName: 'practice-inventory-check-function',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Inventory Check - Received event:', JSON.stringify(event, null, 2));
          
          // Simulate inventory check logic
          const inventoryData = {
            orderId: event.orderId || 'unknown',
            items: event.items || [],
            inventoryStatus: 'checked',
            availableStock: event.items ? event.items.map(item => ({
              ...item,
              inStock: Math.random() > 0.1, // 90% chance in stock
              stockLevel: Math.floor(Math.random() * 100) + 10
            })) : [],
            checkedAt: new Date().toISOString(),
            checkedBy: 'inventory-check-lambda'
          };
          
          console.log('Inventory Check - Result:', JSON.stringify(inventoryData, null, 2));
          
          return {
            statusCode: 200,
            body: inventoryData
          };
        };
      `),
      timeout: cdk.Duration.seconds(30),
      logGroup: new logs.LogGroup(this, 'practice-inventory-check-log-group', {
        logGroupName: '/aws/lambda/practice-inventory-check-function',
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    });

    // Payment Processing Lambda Function  
    const paymentProcessFunction = new lambda.Function(this, 'practice-payment-process-function-id', {
      functionName: 'practice-payment-process-function',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Payment Process - Received event:', JSON.stringify(event, null, 2));
          
          // Simulate payment processing logic
          const paymentData = {
            orderId: event.orderId || 'unknown',
            totalAmount: event.totalAmount || 0,
            paymentStatus: Math.random() > 0.05 ? 'approved' : 'declined', // 95% approval rate
            transactionId: 'txn-' + Date.now(),
            paymentMethod: 'credit_card',
            processedAt: new Date().toISOString(),
            processedBy: 'payment-process-lambda'
          };
          
          console.log('Payment Process - Result:', JSON.stringify(paymentData, null, 2));
          
          return {
            statusCode: 200,
            body: paymentData
          };
        };
      `),
      timeout: cdk.Duration.seconds(30),
      logGroup: new logs.LogGroup(this, 'practice-payment-process-log-group', {
        logGroupName: '/aws/lambda/practice-payment-process-function',
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    });

    // Grant Lambda functions access to S3 bucket
    s3Bucket.grantReadWrite(orderProcessorFunction);
    s3Bucket.grantReadWrite(inventoryCheckFunction);
    s3Bucket.grantReadWrite(paymentProcessFunction);

    // Lambda function for storing final results to S3
    const s3StorageFunction = new lambda.Function(this, 'practice-s3-storage-function-id', {
      functionName: 'practice-s3-storage-function',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
        const s3Client = new S3Client();
        
        exports.handler = async (event) => {
          console.log('S3 Storage - Received event:', JSON.stringify(event, null, 2));
          
          try {
            const params = {
              Bucket: process.env.S3_BUCKET_NAME,
              Key: \`orders/\${event.body.orderId}.json\`,
              Body: JSON.stringify(event.body, null, 2),
              ContentType: 'application/json'
            };
            
            console.log('S3 Storage - Putting object with params:', JSON.stringify(params, null, 2));
            
            const command = new PutObjectCommand(params);
            const result = await s3Client.send(command);
            
            console.log('S3 Storage - Object stored successfully:', JSON.stringify(result, null, 2));
            
            const finalResult = {
              statusCode: 200,
              body: {
                ...event.body,
                s3Location: \`s3://\${process.env.S3_BUCKET_NAME}/orders/\${event.body.orderId}.json\`,
                etag: result.ETag,
                storedAt: new Date().toISOString(),
                processedBy: 's3-storage-lambda'
              }
            };
            
            return finalResult;
          } catch (error) {
            console.error('S3 Storage - Error occurred:', error);
            throw error;
          }
        };
      `),
      environment: {
        S3_BUCKET_NAME: s3Bucket.bucketName,
      },
      timeout: cdk.Duration.seconds(30),
      logGroup: s3StorageLogGroup,
    });

    // Grant S3 storage function access to S3 bucket
    s3Bucket.grantReadWrite(s3StorageFunction);

    const storeInS3Task = new sfnTasks.LambdaInvoke(this, 'practice-store-order-s3-task', {
      lambdaFunction: s3StorageFunction,
      outputPath: '$.Payload',
    });

    // Step Functions Definition with Parallel Processing
    const processOrderTask = new sfnTasks.LambdaInvoke(this, 'practice-process-order-task', {
      lambdaFunction: orderProcessorFunction,
      outputPath: '$.Payload',
    });

    const inventoryCheckTask = new sfnTasks.LambdaInvoke(this, 'practice-inventory-check-task', {
      lambdaFunction: inventoryCheckFunction,
      outputPath: '$.Payload',
    });

    const paymentProcessTask = new sfnTasks.LambdaInvoke(this, 'practice-payment-process-task', {
      lambdaFunction: paymentProcessFunction,
      outputPath: '$.Payload',
    });

    // Parallel execution of inventory check and payment processing
    const parallelProcessing = new stepfunctions.Parallel(this, 'practice-parallel-processing', {
      comment: 'Process inventory check and payment in parallel',
      resultPath: '$.parallelResults'
    });

    // Configure parallel branches to receive input from the prepared data
    parallelProcessing.branch(
      new stepfunctions.Pass(this, 'extract-input-for-inventory', {
        inputPath: '$.inputForParallel'
      }).next(inventoryCheckTask)
    );
    parallelProcessing.branch(
      new stepfunctions.Pass(this, 'extract-input-for-payment', {
        inputPath: '$.inputForParallel'
      }).next(paymentProcessTask)
    );

    // Lambda function to merge parallel results
    const mergeResultsFunction = new lambda.Function(this, 'practice-merge-results-function-id', {
      functionName: 'practice-merge-results-function',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Merge Results - Received event:', JSON.stringify(event, null, 2));
          
          // Extract results from parallel execution
          const orderData = event.orderProcessing?.body || {};
          const inventoryData = event.parallelResults?.[0]?.body || {};
          const paymentData = event.parallelResults?.[1]?.body || {};
          
          // Merge all results
          const mergedResult = {
            orderId: orderData.orderId || inventoryData.orderId || paymentData.orderId,
            orderDetails: orderData,
            inventoryCheck: inventoryData,
            paymentProcessing: paymentData,
            finalStatus: paymentData.paymentStatus === 'approved' ? 'completed' : 'failed',
            processedAt: new Date().toISOString(),
            processedBy: 'merge-results-lambda'
          };
          
          console.log('Merge Results - Final result:', JSON.stringify(mergedResult, null, 2));
          
          return {
            statusCode: 200,
            body: mergedResult
          };
        };
      `),
      timeout: cdk.Duration.seconds(30),
      logGroup: new logs.LogGroup(this, 'practice-merge-results-log-group', {
        logGroupName: '/aws/lambda/practice-merge-results-function',
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }),
    });

    const mergeResultsTask = new sfnTasks.LambdaInvoke(this, 'practice-merge-results-task', {
      lambdaFunction: mergeResultsFunction,
      inputPath: '$',
      resultPath: '$.mergedResults',
      outputPath: '$.mergedResults.Payload',
    });

    // Updated workflow definition with parallel processing
    const orderWorkflowDefinition = processOrderTask
      .next(new stepfunctions.Pass(this, 'prepare-parallel-input', {
        parameters: {
          'orderProcessing.$': '$',
          'inputForParallel.$': '$'
        }
      }))
      .next(parallelProcessing)
      .next(new stepfunctions.Pass(this, 'combine-results', {
        parameters: {
          'orderProcessing.$': '$.orderProcessing',
          'parallelResults.$': '$.parallelResults'
        }
      }))
      .next(mergeResultsTask)
      .next(storeInS3Task);

    const orderStateMachine = new stepfunctions.StateMachine(this, 'practice-order-state-machine-id', {
      stateMachineName: 'practice-order-workflow',
      definitionBody: stepfunctions.DefinitionBody.fromChainable(orderWorkflowDefinition),
      timeout: cdk.Duration.minutes(5),
      logs: {
        destination: stepFunctionsLogGroup,
        level: stepfunctions.LogLevel.ALL,
      },
    });

    // API Gateway Lambda Function for triggering Step Functions
    const apiLambdaFunction = new lambda.Function(this, 'practice-api-lambda-function-id', {
      functionName: 'practice-api-lambda-function',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        const { SFNClient, StartExecutionCommand } = require('@aws-sdk/client-sfn');
        const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
        const sfnClient = new SFNClient();
        const s3Client = new S3Client();
        
        exports.handler = async (event) => {
          console.log('Received event:', JSON.stringify(event, null, 2));
          
          try {
            const httpMethod = event.httpMethod;
            
            if (httpMethod === 'GET') {
              // Handle GET request - retrieve order data
              return await handleGetRequest(event);
            } else if (httpMethod === 'POST') {
              // Handle POST request - start workflow
              return await handlePostRequest(event);
            } else {
              return {
                statusCode: 405,
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                  message: 'Method not allowed',
                  allowedMethods: ['GET', 'POST']
                })
              };
            }
          } catch (error) {
            console.error('Error occurred:', error);
            return {
              statusCode: 500,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              },
              body: JSON.stringify({
                message: 'Internal server error',
                error: error.message,
                timestamp: new Date().toISOString()
              })
            };
          }
        };
        
        async function handleGetRequest(event) {
          console.log('Handling GET request');
          
          try {
            // List objects in the orders folder
            const listParams = {
              Bucket: process.env.S3_BUCKET_NAME,
              Prefix: 'orders/',
              MaxKeys: 50
            };
            
            const listCommand = new ListObjectsV2Command(listParams);
            const listResult = await s3Client.send(listCommand);
            
            console.log('S3 list result:', JSON.stringify(listResult, null, 2));
            
            if (!listResult.Contents || listResult.Contents.length === 0) {
              return {
                statusCode: 200,
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({
                  message: 'No orders found',
                  orders: [],
                  totalCount: 0,
                  retrievedAt: new Date().toISOString()
                })
              };
            }
            
            // Retrieve the most recent orders (limit to 10)
            const recentOrders = listResult.Contents
              .sort((a, b) => new Date(b.LastModified) - new Date(a.LastModified))
              .slice(0, 10);
            
            const orders = [];
            for (const orderFile of recentOrders) {
              try {
                const getParams = {
                  Bucket: process.env.S3_BUCKET_NAME,
                  Key: orderFile.Key
                };
                
                const getCommand = new GetObjectCommand(getParams);
                const getResult = await s3Client.send(getCommand);
                
                const orderData = JSON.parse(await getResult.Body.transformToString());
                orders.push({
                  ...orderData,
                  fileName: orderFile.Key,
                  lastModified: orderFile.LastModified,
                  size: orderFile.Size
                });
              } catch (err) {
                console.error(\`Error reading order file \${orderFile.Key}:\`, err);
              }
            }
            
            return {
              statusCode: 200,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              },
              body: JSON.stringify({
                message: 'Orders retrieved successfully',
                orders: orders,
                totalCount: listResult.KeyCount || 0,
                retrievedAt: new Date().toISOString(),
                pagination: {
                  limit: 10,
                  hasMore: listResult.IsTruncated || false
                }
              })
            };
            
          } catch (error) {
            console.error('Error in GET request:', error);
            throw error;
          }
        }
        
        async function handlePostRequest(event) {
          console.log('Handling POST request');
          
          const body = event.body ? JSON.parse(event.body) : {};
          console.log('Parsed body:', JSON.stringify(body, null, 2));
          
          // Validate required fields for order creation
          if (!body.orderId && !body.customerName) {
            body.orderId = 'order-' + Date.now();
          }
          
          // Start Step Functions execution
          const executionName = 'execution-' + Date.now();
          const params = {
            stateMachineArn: process.env.STATE_MACHINE_ARN,
            input: JSON.stringify(body),
            name: executionName
          };
          
          console.log('Starting execution with params:', JSON.stringify(params, null, 2));
          
          const command = new StartExecutionCommand(params);
          const result = await sfnClient.send(command);
          
          console.log('Step Functions execution started:', JSON.stringify(result, null, 2));
          
          const response = {
            message: 'Order workflow started successfully',
            executionArn: result.executionArn,
            executionName: executionName,
            startDate: result.startDate,
            inputData: body,
            workflowStatus: 'started'
          };
          
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            },
            body: JSON.stringify(response)
          };
        }
      `),
      environment: {
        STATE_MACHINE_ARN: orderStateMachine.stateMachineArn,
        S3_BUCKET_NAME: s3Bucket.bucketName,
      },
      timeout: cdk.Duration.seconds(30),
      logGroup: apiLambdaLogGroup,
    });

    // Grant API Lambda permission to start Step Functions execution
    orderStateMachine.grantStartExecution(apiLambdaFunction);
    
    // Grant API Lambda permission to read from S3 bucket (for GET requests)
    s3Bucket.grantRead(apiLambdaFunction);

    // API Gateway Configuration
    const api = new apigateway.RestApi(this, 'practice-api-gateway-id', {
      restApiName: 'practice-order-api',
      description: 'API Gateway for Order Processing System',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key', 'X-Amz-Security-Token'],
      },
    });

    // API Gateway Integration with Lambda
    const apiIntegration = new apigateway.LambdaIntegration(apiLambdaFunction, {
      requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
    });

    // API Gateway Resources and Methods
    const ordersResource = api.root.addResource('orders');
    ordersResource.addMethod('POST', apiIntegration);
    ordersResource.addMethod('GET', apiIntegration);

    // CloudWatch Dashboard for monitoring
    const dashboard = new cloudwatch.Dashboard(this, 'practice-order-dashboard-id', {
      dashboardName: 'practice-order-monitoring-dashboard',
    });

    // Add Step Functions metrics to dashboard
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Step Functions Executions',
        left: [orderStateMachine.metricStarted()],
        right: [orderStateMachine.metricSucceeded(), orderStateMachine.metricFailed()],
      })
    );

    // Add API Gateway metrics to dashboard
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Gateway Requests',
        left: [api.metricCount()],
        right: [api.metricLatency()],
      })
    );

    // WAF v2 Log Group for security monitoring
    const wafLogGroup = new logs.LogGroup(this, 'practice-waf-log-group', {
      logGroupName: 'aws-waf-logs-practice-order-api',
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Comprehensive WAF v2 WebACL with security rules
    const webAcl = new wafv2.CfnWebACL(this, 'practice-waf-webacl-id', {
      name: 'practice-order-api-waf',
      scope: 'REGIONAL', // For API Gateway (use CLOUDFRONT for CloudFront distributions)
      defaultAction: { allow: {} },
      description: 'WAF WebACL for Order Processing API with comprehensive security rules',
      
      rules: [
        // Rate limiting rule - prevent DDoS and abuse
        {
          name: 'RateLimitRule',
          priority: 1,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              limit: 2000, // 2000 requests per 5-minute window per IP
              aggregateKeyType: 'IP',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimitRule',
          },
        },
        
        // AWS Managed Rule - Core Rule Set (CRS)
        {
          name: 'AWSManagedRulesCommonRuleSet',
          priority: 2,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
              excludedRules: [
                { name: 'SizeRestrictions_BODY' },
                { name: 'GenericRFI_BODY' },
              ],
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'CommonRuleSetMetric',
          },
        },
        
        // AWS Managed Rule - Known Bad Inputs
        {
          name: 'AWSManagedRulesKnownBadInputsRuleSet',
          priority: 3,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesKnownBadInputsRuleSet',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'KnownBadInputsMetric',
          },
        },
        
        // AWS Managed Rule - IP Reputation List
        {
          name: 'AWSManagedRulesAmazonIpReputationList',
          priority: 4,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesAmazonIpReputationList',
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'IpReputationMetric',
          },
        },
        
        // Geographic restriction 
        {
          name: 'GeographicRestriction',
          priority: 5,
          action: { block: {} },
          statement: {
            geoMatchStatement: {
              countryCodes: ['CN', 'RU'], // Block China and Russia
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'GeographicRestrictionMetric',
          },
        },
        
        // SQL Injection protection
        {
          name: 'SQLiRule',
          priority: 6,
          action: { block: {} },
          statement: {
            sqliMatchStatement: {
              fieldToMatch: { body: {} },
              textTransformations: [
                { priority: 0, type: 'URL_DECODE' },
                { priority: 1, type: 'HTML_ENTITY_DECODE' },
              ],
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'SQLiRuleMetric',
          },
        },
        
        // XSS (Cross-Site Scripting) protection
        {
          name: 'XSSRule',
          priority: 7,
          action: { block: {} },
          statement: {
            xssMatchStatement: {
              fieldToMatch: { body: {} },
              textTransformations: [
                { priority: 0, type: 'URL_DECODE' },
                { priority: 1, type: 'HTML_ENTITY_DECODE' },
              ],
            },
          },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'XSSRuleMetric',
          },
        },
      ],
      
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'practice-order-api-waf',
      },
    });

    // Associate WAF WebACL with API Gateway
    const wafAssociation = new wafv2.CfnWebACLAssociation(this, 'practice-waf-association-id', {
      resourceArn: api.deploymentStage.stageArn,
      webAclArn: webAcl.attrArn,
    });

    // WAF Logging Configuration
    const wafLoggingConfig = new wafv2.CfnLoggingConfiguration(this, 'aws-waf-logs-id', {
      resourceArn: webAcl.attrArn,
      logDestinationConfigs: [`arn:aws:logs:${this.region}:${this.account}:log-group:${wafLogGroup.logGroupName}`],
    });

    // Add WAF metrics to CloudWatch Dashboard
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'WAF Metrics',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/WAFV2',
            metricName: 'AllowedRequests',
            dimensionsMap: {
              WebACL: webAcl.name!,
              Region: this.region,
            },
          }),
        ],
        right: [
          new cloudwatch.Metric({
            namespace: 'AWS/WAFV2',
            metricName: 'BlockedRequests',
            dimensionsMap: {
              WebACL: webAcl.name!,
              Region: this.region,
            },
          }),
        ],
      })
    );

    // Stack Outputs
    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: api.url,
      description: 'API Gateway URL for Order Processing',
    });

    new cdk.CfnOutput(this, 'StateMachineArn', {
      value: orderStateMachine.stateMachineArn,
      description: 'Step Functions State Machine ARN',
    });

    new cdk.CfnOutput(this, 'S3BucketName', {
      value: s3Bucket.bucketName,
      description: 'S3 Bucket for storing processed orders',
    });

    new cdk.CfnOutput(this, 'OrderProcessorLogGroup', {
      value: orderProcessorLogGroup.logGroupName,
      description: 'CloudWatch Log Group for Order Processor Lambda',
    });

    new cdk.CfnOutput(this, 'S3StorageLogGroup', {
      value: s3StorageLogGroup.logGroupName,
      description: 'CloudWatch Log Group for S3 Storage Lambda',
    });

    new cdk.CfnOutput(this, 'ApiLambdaLogGroup', {
      value: apiLambdaLogGroup.logGroupName,
      description: 'CloudWatch Log Group for API Lambda',
    });

    new cdk.CfnOutput(this, 'StepFunctionsLogGroup', {
      value: stepFunctionsLogGroup.logGroupName,
      description: 'CloudWatch Log Group for Step Functions',
    });

    new cdk.CfnOutput(this, 'WAFWebACLArn', {
      value: webAcl.attrArn,
      description: 'WAF WebACL ARN for API Gateway protection',
    });

    new cdk.CfnOutput(this, 'WAFWebACLId', {
      value: webAcl.attrId,
      description: 'WAF WebACL ID for monitoring and management',
    });

    new cdk.CfnOutput(this, 'WAFLogGroup', {
      value: wafLogGroup.logGroupName,
      description: 'CloudWatch Log Group for WAF security logs',
    });

    new cdk.CfnOutput(this, 'ShieldStandardInfo', {
      value: 'AWS Shield Standard is automatically enabled for all AWS resources',
      description: 'Shield Standard provides basic DDoS protection at no additional cost',
    });
  }
}
