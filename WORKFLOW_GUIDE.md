# 🔄 Order Processing Workflow Guide

## 📋 **Complete Architecture Overview**

```
Client Request → API Gateway → Lambda → Step Functions → [Lambda 1 → Lambda 2] → S3 Storage
                    ↓               ↓           ↓              ↓            ↓
                CloudWatch      CloudWatch  CloudWatch   CloudWatch   CloudWatch
                  Logs            Logs        Logs         Logs         Logs
```

## 🚀 **Detailed Workflow Explanation**

### **Step 1: API Gateway Entry Point**
```
📥 Client sends HTTP POST to: /orders
📋 Request Body Example:
{
  "customerName": "John Doe",
  "items": [
    {"name": "Laptop", "price": 999.99, "quantity": 1}
  ],
  "totalAmount": 999.99
}
```

**What happens:**
- API Gateway receives the HTTP request
- CORS headers are automatically added for cross-origin requests
- Request is forwarded to the **API Lambda Function**

---

### **Step 2: API Lambda Function**
```
🔧 Function: practice-api-lambda-function
📊 CloudWatch Log Group: /aws/lambda/practice-api-lambda-function
```

**What happens:**
1. **Receives** API Gateway event
2. **Parses** the JSON request body
3. **Starts** Step Functions execution with the parsed data
4. **Returns** execution details to the client immediately

**Output to Client:**
```json
{
  "message": "Order workflow started successfully",
  "executionArn": "arn:aws:states:...",
  "executionName": "execution-1234567890",
  "startDate": "2024-01-15T10:30:00.000Z",
  "inputData": { ... }
}
```

---

### **Step 3: Step Functions State Machine**
```
🔄 State Machine: practice-order-workflow
📊 CloudWatch Log Group: /aws/stepfunctions/practice-order-workflow
```

**State Machine Definition:**
```
processOrderTask → storeInS3Task
```

**What happens:**
1. **Receives** input data from API Lambda
2. **Executes** two sequential Lambda functions
3. **Passes** output from first function as input to second function
4. **Logs** all state transitions and executions

---

### **Step 4: Order Processor Lambda (First Step)**
```
🔧 Function: practice-order-processor-function
📊 CloudWatch Log Group: /aws/lambda/practice-order-processor-function
```

**Input (from Step Functions):**
```json
{
  "customerName": "John Doe",
  "items": [{"name": "Laptop", "price": 999.99, "quantity": 1}],
  "totalAmount": 999.99
}
```

**Processing Logic:**
1. **Generates** orderId if not provided
2. **Adds** timestamp and processing metadata
3. **Enriches** order data with default values
4. **Returns** processed order data

**Output:**
```json
{
  "statusCode": 200,
  "body": {
    "orderId": "order-1234567890",
    "customerName": "John Doe",
    "items": [{"name": "Laptop", "price": 999.99, "quantity": 1}],
    "totalAmount": 999.99,
    "status": "processed",
    "timestamp": "2024-01-15T10:30:01.000Z",
    "processedBy": "order-processor-lambda"
  }
}
```

---

### **Step 5: S3 Storage Lambda (Second Step)**
```
🔧 Function: practice-s3-storage-function
📊 CloudWatch Log Group: /aws/lambda/practice-s3-storage-function
```

**Input (from Order Processor - via outputPath: '$.Payload'):**
```json
{
  "statusCode": 200,
  "body": {
    "orderId": "order-1234567890",
    "customerName": "John Doe",
    "items": [...],
    "totalAmount": 999.99,
    "status": "processed",
    "timestamp": "2024-01-15T10:30:01.000Z",
    "processedBy": "order-processor-lambda"
  }
}
```

**Processing Logic:**
1. **Extracts** order data from `event.body`
2. **Creates** S3 key: `orders/{orderId}.json`
3. **Stores** processed order in S3 bucket
4. **Returns** final result with S3 location

**Output:**
```json
{
  "statusCode": 200,
  "body": {
    "orderId": "order-1234567890",
    "customerName": "John Doe",
    "items": [...],
    "totalAmount": 999.99,
    "status": "processed",
    "timestamp": "2024-01-15T10:30:01.000Z",
    "processedBy": "order-processor-lambda",
    "s3Location": "s3://practice-s3-bucket-name/orders/order-1234567890.json",
    "etag": "\"abc123...\"",
    "storedAt": "2024-01-15T10:30:02.000Z"
  }
}
```

---

## 🎯 **Key Workflow Features**

### **Output-to-Input Chaining**
```
Step Functions uses outputPath: '$.Payload' to pass Lambda results:

Lambda 1 Output → Step Functions → Lambda 2 Input
```

### **Comprehensive Logging**
- **API Gateway**: Request/response logging
- **All Lambdas**: Detailed execution logs with emojis for easy identification
- **Step Functions**: State transitions and execution flow
- **1-week retention** for all log groups

### **Error Handling**
- Try-catch blocks in all Lambda functions
- Proper HTTP status codes
- Detailed error messages in logs
- Step Functions timeout protection (5 minutes)

---

## 🧪 **Testing Instructions**

### **1. Deploy the Infrastructure**
```bash
# Build and deploy
npm run build
cdk deploy

# Note the outputs:
# - ApiGatewayUrl
# - StateMachineArn  
# - S3BucketName
# - Log group names
```

### **2. Test via AWS Console (Step Functions)**

**Navigate to Step Functions Console:**
1. Go to AWS Console → Step Functions
2. Find: `practice-order-workflow`
3. Click "Start execution"

**Test Input:**
```json
{
  "customerName": "Console Test User",
  "items": [
    {"name": "Test Product", "price": 100.00, "quantity": 1}
  ],
  "totalAmount": 100.00
}
```

**Monitor Execution:**
- Watch the visual workflow execution
- Check each step's input/output
- Monitor execution status

### **3. Test via AWS Console (API Gateway)**

**Navigate to API Gateway Console:**
1. Go to AWS Console → API Gateway
2. Find: `practice-order-api`
3. Go to Resources → `/orders` → `POST` → "TEST"

**Test Request:**
```json
{
  "customerName": "API Test User",
  "items": [
    {"name": "API Test Product", "price": 250.00, "quantity": 2}
  ],
  "totalAmount": 500.00
}
```

### **4. Test Locally with Scripts**

**Make scripts executable:**
```bash
chmod +x test-scripts/test-api.sh
chmod +x test-scripts/check-logs.sh
```

**Run API tests:**
```bash
# Replace with your actual API Gateway URL from CDK output
./test-scripts/test-api.sh https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod
```

**Check logs:**
```bash
./test-scripts/check-logs.sh
```

### **5. Test with curl (Manual)**

**Simple test:**
```bash
curl -X POST "https://YOUR_API_URL/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Curl Test User",
    "items": [{"name": "Curl Product", "price": 75.00, "quantity": 1}],
    "totalAmount": 75.00
  }'
```

**Complex test:**
```bash
curl -X POST "https://YOUR_API_URL/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "custom-order-123",
    "customerName": "Advanced Test User", 
    "items": [
      {"name": "Premium Product", "price": 199.99, "quantity": 2},
      {"name": "Addon", "price": 49.99, "quantity": 1}
    ],
    "totalAmount": 449.97,
    "priority": "high",
    "notes": "Urgent delivery required"
  }'
```

---

## 📊 **Monitoring & Logs**

### **CloudWatch Log Groups:**
- `/aws/lambda/practice-api-lambda-function`
- `/aws/lambda/practice-order-processor-function` 
- `/aws/lambda/practice-s3-storage-function`
- `/aws/stepfunctions/practice-order-workflow`

### **Real-time Log Monitoring:**
```bash
# Watch API Lambda logs
aws logs tail /aws/lambda/practice-api-lambda-function --follow

# Watch Order Processor logs  
aws logs tail /aws/lambda/practice-order-processor-function --follow

# Watch S3 Storage logs
aws logs tail /aws/lambda/practice-s3-storage-function --follow

# Watch Step Functions logs
aws logs tail /aws/stepfunctions/practice-order-workflow --follow
```

### **CloudWatch Dashboard:**
- **Step Functions Metrics**: Executions started, succeeded, failed
- **API Gateway Metrics**: Request count, latency, errors
- **Lambda Metrics**: Duration, errors, invocations

### **S3 Verification:**
```bash
# List stored orders
aws s3 ls s3://practice-s3-bucket-name/orders/

# Download a specific order
aws s3 cp s3://practice-s3-bucket-name/orders/order-1234567890.json ./
```

---

## 🔍 **Troubleshooting**

### **Common Issues:**

**1. Step Functions execution fails:**
- Check Lambda function logs
- Verify IAM permissions
- Check input/output data format

**2. API Gateway returns 500:**
- Check API Lambda logs
- Verify Step Functions permissions
- Check request body format

**3. S3 storage fails:**
- Check S3 bucket permissions
- Verify bucket exists
- Check Lambda IAM role

**4. No logs appearing:**
- Verify log group names
- Check CloudWatch permissions
- Wait a few minutes for propagation

### **Debug Commands:**
```bash
# Check Step Functions executions
aws stepfunctions list-executions --state-machine-arn YOUR_STATE_MACHINE_ARN

# Get specific execution details
aws stepfunctions describe-execution --execution-arn YOUR_EXECUTION_ARN

# Check API Gateway deployment
aws apigateway get-deployments --rest-api-id YOUR_API_ID
```

---

## ✅ **Success Indicators**

1. **API Response**: Returns execution details with 200 status
2. **Step Functions**: Shows "Succeeded" status in console
3. **CloudWatch Logs**: All functions log their steps with emojis
4. **S3**: Order file appears in `orders/` folder
5. **Dashboard**: Metrics show successful executions

---

This comprehensive workflow ensures reliable order processing with full visibility, error handling, and easy debugging capabilities! 