# Security and Testing Guide

This document provides comprehensive information about the security implementation (AWS WAF and Shield) and Step Functions testing approach in the Order Processing Infrastructure.

## 🛡️ Security Implementation

### AWS WAF (Web Application Firewall)

The project implements a comprehensive WAF v2 WebACL with multiple security layers:

#### **Security Rules Implemented:**

1. **Rate Limiting Protection**
   - Limits to 2000 requests per 5-minute window per IP
   - Prevents DDoS attacks and API abuse
   - Automatically blocks excessive traffic

2. **AWS Managed Rule Sets**
   - **Core Rule Set (CRS)**: Protects against OWASP Top 10 vulnerabilities
   - **Known Bad Inputs**: Blocks requests with malicious patterns
   - **IP Reputation List**: Blocks requests from known malicious IPs

3. **Geographic Restrictions**
   - Example configuration blocks traffic from specific countries
   - Easily configurable based on business requirements
   - Helps comply with data sovereignty requirements

4. **Injection Attack Protection**
   - **SQL Injection (SQLi)**: Analyzes request body for SQL injection patterns
   - **Cross-Site Scripting (XSS)**: Detects and blocks XSS attempts
   - Multiple text transformations for comprehensive coverage

#### **WAF Features:**

- **CloudWatch Integration**: Full metrics and logging
- **API Gateway Association**: Direct protection of the order API
- **Logging Configuration**: Detailed security event logging
- **Sampling**: Configurable request sampling for analysis

#### **Configuration Location:**
```typescript
// In lib/order-infra-stack.ts
const webAcl = new wafv2.CfnWebACL(this, 'practice-waf-webacl-id', {
  // ... comprehensive rule configuration
});
```

### AWS Shield Protection

#### **Shield Standard (Included)**
- Automatically enabled for all AWS resources
- Protects against most common network and transport layer DDoS attacks
- No additional cost
- Provides baseline DDoS protection

#### **Shield Advanced (Optional)**
- Available but commented out due to cost (~$3000/month)
- Provides enhanced DDoS protection
- 24/7 access to DDoS Response Team (DRT)
- DDoS cost protection

```typescript
// Uncomment in lib/order-infra-stack.ts for Shield Advanced
const shieldProtection = new shield.CfnProtection(this, 'practice-shield-protection-id', {
  name: 'practice-api-gateway-shield',
  resourceArn: api.deploymentStage.stageArn,
});
```

### Security Monitoring

- **CloudWatch Dashboard**: WAF metrics visualization
- **Log Groups**: Dedicated logging for security events
- **Metrics**: Real-time monitoring of allowed/blocked requests

## 🧪 Step Functions Testing

### Testing Strategy

The project implements a comprehensive testing strategy following AWS best practices:

1. **Component Testing**: Individual Lambda function testing
2. **State Testing**: Individual Step Functions state testing using TestState API
3. **Integration Testing**: Complete workflow testing
4. **Error Handling Testing**: Retry and catch logic validation

### Testing Tools and Libraries

#### **Primary Testing Framework:**
- **Jest**: Main testing framework with TypeScript support
- **AWS SDK v3**: Latest AWS SDK for TestState API access
- **Custom Testing Utilities**: Purpose-built Step Functions testing tools

#### **Third-Party Libraries Used:**
```json
{
  "@aws-sdk/client-sfn": "^3.609.0",      // Step Functions TestState API
  "@aws-sdk/client-lambda": "^3.609.0",   // Lambda function testing
  "@aws-sdk/client-cloudwatch-logs": "^3.609.0", // Log analysis
  "jest": "^29.7.0",                      // Testing framework
  "ts-jest": "^29.2.5",                   // TypeScript support
  "axios": "^1.6.0",                      // HTTP testing
  "uuid": "^9.0.1"                        // Test data generation
}
```

### Local Testing Approach

#### **1. TestState API Testing (Recommended)**
The TestState API allows testing individual states without deploying the full workflow:

```javascript
// Example usage
const result = await tester.testState(
  'OrderProcessor_ValidOrder',
  orderProcessorState,
  input,
  roleArn,
  { inspectionLevel: 'DEBUG' }
);
```

**Benefits:**
- Fast execution (no cold starts)
- Detailed debugging information
- Cost-effective testing
- Isolation of state logic

#### **2. Component Testing**
Individual Lambda functions can be tested directly:

```javascript
const result = await tester.testLambdaFunction(
  'practice-order-processor-function',
  testPayload
);
```

#### **3. Mock-Based Testing**
For offline development and CI/CD:

```javascript
// Jest mocks for AWS SDK
jest.mock('@aws-sdk/client-sfn');
jest.mock('@aws-sdk/client-lambda');
```

### Test Execution Commands

```bash
# Run all tests
npm test

# Run Step Functions specific tests
npm run test:stepfunctions

# Run tests in watch mode
npm run test:watch

# Run local state testing
npm run stepfunctions:test-state

# Run specific test scenarios
node test-scripts/test-state-runner.js --choice    # Test choice logic
node test-scripts/test-state-runner.js --errors    # Test error handling
node test-scripts/test-state-runner.js --all       # Run all tests
```

### Test Scenarios Covered

#### **Order Processing Tests:**
- Valid order processing
- Empty order handling
- Custom order ID preservation
- Multiple items processing

#### **S3 Storage Tests:**
- Successful storage operations
- Error handling and recovery
- Data integrity validation

#### **Choice State Tests:**
- Express order routing
- Standard order routing
- Premium order routing
- Default case handling

#### **Error Handling Tests:**
- Retry logic validation
- Catch block testing
- Error propagation
- Recovery scenarios

### Test Reports and Monitoring

#### **Automated Reporting:**
- JSON-formatted test results
- Success/failure metrics
- Performance measurements
- Detailed execution logs

#### **Report Location:**
```
test-results/stepfunctions-test-report-{timestamp}.json
```

#### **Coverage Requirements:**
- 70% minimum coverage for all components
- Branch, function, line, and statement coverage
- Comprehensive error scenario testing

### Best Practices for Step Functions Testing

1. **State Isolation**: Test each state independently
2. **Data Flow Validation**: Verify input/output transformations
3. **Error Scenarios**: Test all error paths and retry logic
4. **Performance Testing**: Monitor execution times and resource usage
5. **Mocking Strategy**: Use mocks for external dependencies
6. **Continuous Testing**: Integrate with CI/CD pipeline

### Local Development Workflow

1. **Setup Environment:**
   ```bash
   npm install
   cp .env.example .env.test
   # Configure AWS credentials and region
   ```

2. **Run Component Tests:**
   ```bash
   npm run test:local
   ```

3. **Test Individual States:**
   ```bash
   npm run stepfunctions:test-state
   ```

4. **Integration Testing:**
   ```bash
   npm run test:stepfunctions
   ```

5. **Generate Reports:**
   ```bash
   npm test -- --coverage
   ```

## 🔧 Configuration

### Environment Variables

Create `.env.test` file for testing:
```bash
AWS_REGION=us-east-1
STEP_FUNCTIONS_ROLE_ARN=arn:aws:iam::123456789012:role/StepFunctionsExecutionRole
AWS_PROFILE=your-aws-profile
```

### AWS Permissions Required

For testing, ensure your AWS credentials have:
- `states:TestState` - For TestState API
- `lambda:InvokeFunction` - For Lambda testing
- `logs:DescribeLogGroups` - For log analysis
- `logs:FilterLogEvents` - For log debugging

## 📊 Monitoring and Observability

### CloudWatch Integration

- **WAF Metrics**: Request counts, blocked requests, rule hits
- **Step Functions Metrics**: Execution counts, success/failure rates
- **Lambda Metrics**: Duration, error rates, concurrent executions
- **API Gateway Metrics**: Request latency, error rates

### Log Analysis

- **WAF Logs**: Security events and blocked requests
- **Step Functions Logs**: Execution traces and state transitions
- **Lambda Logs**: Function execution details and errors

### Dashboards

The CloudWatch dashboard provides:
- Real-time security metrics
- Workflow execution status
- Performance monitoring
- Error tracking and alerting

## 🚀 Deployment and Verification

### Security Verification

1. **Deploy Infrastructure:**
   ```bash
   npm run cdk deploy
   ```

2. **Verify WAF Association:**
   - Check API Gateway has WAF WebACL attached
   - Verify WAF rules are active
   - Test rate limiting functionality

3. **Security Testing:**
   - Test malicious request blocking
   - Verify geographic restrictions
   - Validate injection protection

### Step Functions Verification

1. **Test via Console:**
   - AWS Step Functions Console
   - Manual execution with test data
   - Verify state transitions

2. **API Testing:**
   ```bash
   curl -X POST {API_GATEWAY_URL}/orders \
     -H "Content-Type: application/json" \
     -d '{"customerName":"Test","items":[{"name":"Product","price":100,"quantity":1}],"totalAmount":100}'
   ```

3. **Monitor Execution:**
   - CloudWatch logs for detailed traces
   - S3 bucket for stored orders
   - CloudWatch metrics for performance

## 📋 Requirements Compliance

✅ **All Requirements Met:**

1. **AWS CDK**: Complete infrastructure as code
2. **VPC**: Custom VPC with public/private subnets
3. **EC2**: Instance with proper security groups
4. **S3**: Bucket for order storage with versioning
5. **CloudWatch**: Comprehensive logging and monitoring
6. **Log Groups**: Dedicated log groups for all services
7. **API Gateway**: RESTful API with CORS configuration
8. **Step Functions**: Complete order processing workflow
9. **AWS WAF**: Comprehensive web application firewall
10. **AWS Shield**: Standard protection (Advanced available)
11. **Local Testing**: Complete testing framework with best practices

This implementation provides enterprise-grade security and comprehensive testing capabilities for the order processing infrastructure. 