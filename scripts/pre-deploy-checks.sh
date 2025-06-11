#!/bin/bash

# Pre-Deployment Validation Script for Order Infrastructure
# Run this script before deploying to any environment
# Usage: ./scripts/pre-deploy-checks.sh [environment-file]
# Example: ./scripts/pre-deploy-checks.sh .env.prod

set -e

# Default environment file
ENV_FILE="${1:-.env.dev}"

echo "Starting Pre-Deployment Validation..."
echo "========================================"
echo "Environment file: $ENV_FILE"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}Success: $2${NC}"
    else
        echo -e "${RED}Error: $2${NC}"
        exit 1
    fi
}

print_warning() {
    echo -e "${YELLOW}Warning: $1${NC}"
}

echo ""
echo "1. Environment Configuration Check"
echo "-----------------------------------"

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
    print_warning "Environment file $ENV_FILE not found!"
    
    # Create template if it doesn't exist
    if [ ! -f "env.template" ]; then
        echo "Creating env.template..."
        cat > env.template << 'EOF'
# Environment Configuration Template
# Copy this file to .env.dev, .env.staging, or .env.prod and update with your actual AWS account details

# Environment identifier (dev, staging, prod)
ENV_NAME=dev

# Your AWS Account ID (12-digit number)  
ACCOUNT_ID=123456789012

# AWS Region for deployment
REGION=us-east-1

# Optional: Additional configuration
# PROFILE=default
# CDK_DEFAULT_ACCOUNT=123456789012
# CDK_DEFAULT_REGION=us-east-1

# Instructions:
# 1. Copy this file: cp env.template .env.dev
# 2. Update ACCOUNT_ID with your actual AWS account ID
# 3. Update REGION if you want to deploy to a different region
# 4. Update ENV_NAME for different environments (staging, prod)

# Note: Never commit actual AWS credentials to version control
# Use AWS CLI configuration or IAM roles instead
EOF
    fi
    
    echo "Please create $ENV_FILE by copying env.template:"
    echo "  cp env.template $ENV_FILE"
    echo "  nano $ENV_FILE  # Update with your AWS account details"
    exit 1
fi

# Load environment variables from file
echo "Loading environment from $ENV_FILE..."
set -a  # automatically export all variables
source "$ENV_FILE"
set +a  # stop automatically exporting

# Validate required environment variables
if [ -z "$ENV_NAME" ] || [ -z "$ACCOUNT_ID" ] || [ -z "$REGION" ]; then
    print_warning "Missing required environment variables in $ENV_FILE"
    echo "Required variables: ENV_NAME, ACCOUNT_ID, REGION"
    echo "Please update $ENV_FILE with the correct values"
    exit 1
else
    print_status 0 "Environment variables loaded successfully"
    echo "  Environment: $ENV_NAME"
    echo "  Account: $ACCOUNT_ID"
    echo "  Region: $REGION"
fi

# Validate account ID format
if [[ ! "$ACCOUNT_ID" =~ ^[0-9]{12}$ ]]; then
    print_warning "ACCOUNT_ID should be a 12-digit number (current: $ACCOUNT_ID)"
fi

# Validate region format
if [[ ! "$REGION" =~ ^[a-z]{2}-[a-z]+-[0-9]+$ ]]; then
    print_warning "REGION format might be incorrect (current: $REGION)"
fi

echo ""
echo "2. Dependencies Check"
echo "---------------------"

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 18 ]; then
    print_status 0 "Node.js version compatible (v$(node --version))"
else
    print_status 1 "Node.js version too old. Requires v18+"
fi

# Check if dependencies are installed
if [ -d "node_modules" ] && [ -f "package-lock.json" ]; then
    print_status 0 "Dependencies installed"
else
    echo "Installing dependencies..."
    npm install
    print_status $? "Dependencies installation"
fi

echo ""
echo "3. Code Quality & Syntax Check"
echo "-------------------------------"

# TypeScript compilation
npm run build
print_status $? "TypeScript compilation"

# CDK synthesis (validates CDK code)
npm run cdk synth > /dev/null 2>&1
print_status $? "CDK synthesis validation"

echo ""
echo "4. Security & Best Practices Check"
echo "-----------------------------------"

# Check for hardcoded secrets (basic)
if grep -r "password\|secret\|key" lib/ --include="*.ts" | grep -v "keyName\|SecretValue\|secretsmanager" | grep -q "="; then
    print_status 1 "Potential hardcoded secrets found"
else
    print_status 0 "No obvious hardcoded secrets"
fi

# Check for TODO/FIXME comments
TODO_COUNT=$(grep -r "TODO\|FIXME" lib/ --include="*.ts" | wc -l)
if [ "$TODO_COUNT" -gt 0 ]; then
    print_warning "Found $TODO_COUNT TODO/FIXME comments"
else
    print_status 0 "No pending TODO/FIXME items"
fi

echo ""
echo "5. Testing"
echo "----------"

# Run tests if they exist
if npm test > /dev/null 2>&1; then
    print_status 0 "Tests passed"
else
    print_warning "Tests failed or not implemented"
fi

echo ""
echo "6. AWS Configuration Check"
echo "---------------------------"

# Check AWS CLI configuration
if aws sts get-caller-identity > /dev/null 2>&1; then
    CURRENT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
    if [ "$CURRENT_ACCOUNT" = "$ACCOUNT_ID" ]; then
        print_status 0 "AWS credentials match target account"
    else
        print_status 1 "AWS credentials don't match target account ($CURRENT_ACCOUNT vs $ACCOUNT_ID)"
    fi
else
    print_status 1 "AWS credentials not configured"
fi

# Check CDK bootstrap
if aws cloudformation describe-stacks --stack-name CDKToolkit --region $REGION > /dev/null 2>&1; then
    print_status 0 "CDK bootstrapped in region $REGION"
else
    print_warning "CDK not bootstrapped in region $REGION. Run: cdk bootstrap"
fi

echo ""
echo "7. Resource Naming & Conflicts Check"
echo "-------------------------------------"

# Check for potential naming conflicts
STACK_NAME="OrderInfraStack-$ENV_NAME"
if aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION > /dev/null 2>&1; then
    print_warning "Stack $STACK_NAME already exists - this will be an update"
else
    print_status 0 "Stack name available for deployment"
fi

echo ""
echo "8. Cost Estimation"
echo "------------------"

# Basic cost warnings based on environment
if [ "$ENV_NAME" = "prod" ]; then
    print_warning "Production environment - estimated monthly cost components:"
    echo "   - API Gateway: ~\$5-50 (depending on traffic)"
    echo "   - Lambda: ~\$5-100 (depending on usage)"
    echo "   - Step Functions: ~\$25-500 (depending on executions)"
    echo "   - S3: ~\$5-50 (depending on data volume)"
    echo "   - CloudWatch Logs: ~\$10-100 (depending on log volume)"
    echo "   - WAF: ~\$5-50 (depending on requests)"
    echo "   - EC2 Instance: ~\$20-100/month (consider removing for serverless)"
else
    print_warning "Development/staging environment - estimated monthly cost components:"
    echo "   - API Gateway: ~\$1-5/million requests"
    echo "   - Lambda: ~\$0.20/million requests"
    echo "   - Step Functions: ~\$25/million transitions"
    echo "   - S3: ~\$0.023/GB/month"
    echo "   - CloudWatch Logs: ~\$0.50/GB ingested"
    echo "   - WAF: ~\$1/month + \$0.60/million requests"
    echo "   - EC2 Instance: ~\$8-10/month (consider if needed)"
fi

echo ""
echo "9. Security Configuration Review"
echo "--------------------------------"

# Check if WAF is enabled
if grep -q "wafv2.CfnWebACL" lib/order-infra-stack.ts; then
    print_status 0 "WAF protection configured"
else
    print_warning "WAF protection not found"
fi

# Check if logging is configured
if grep -q "logs.LogGroup" lib/order-infra-stack.ts; then
    print_status 0 "CloudWatch logging configured"
else
    print_warning "CloudWatch logging not configured"
fi

# Environment-specific security warnings
if [ "$ENV_NAME" = "prod" ]; then
    echo ""
    print_warning "Production environment checklist:"
    echo "   - Ensure AWS credentials use least privilege IAM roles"
    echo "   - Verify all secrets are in AWS Secrets Manager/Parameter Store"
    echo "   - Confirm backup and disaster recovery procedures"
    echo "   - Set up CloudWatch alarms for critical metrics"
    echo "   - Review and test security incident response procedures"
fi

echo ""
echo "Pre-Deployment Summary"
echo "=========================="
echo "Environment File: $ENV_FILE"
echo "Environment: $ENV_NAME"
echo "Account: $ACCOUNT_ID"
echo "Region: $REGION"
echo "Stack: $STACK_NAME"
echo ""
print_status 0 "Pre-deployment validation completed successfully!"
echo ""
echo "Next steps:"
echo "1. Review the generated CloudFormation template: npm run cdk synth"
echo "2. Deploy with: ENV_NAME=$ENV_NAME ACCOUNT_ID=$ACCOUNT_ID REGION=$REGION npm run cdk deploy"
echo "3. Or use the deploy script: ./deploy.sh $ENV_FILE"
echo "4. Monitor deployment in AWS Console" 