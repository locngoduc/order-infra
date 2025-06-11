#!/bin/bash

# Safe Deployment Script for Order Infrastructure
# This script ensures all validations pass before deployment

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${1:-.env.dev}"  # Default to .env.dev if no argument provided

echo -e "${BLUE}Starting Safe Deployment Process${NC}"
echo "============================================"
echo "Environment file: $ENV_FILE"
echo ""

# Function to print colored output
print_step() {
    echo -e "${BLUE}Step $1: $2${NC}"
}

print_success() {
    echo -e "${GREEN}Success: $1${NC}"
}

print_error() {
    echo -e "${RED}Error: $1${NC}"
    exit 1
}

print_warning() {
    echo -e "${YELLOW}Warning: $1${NC}"
}

# Function to ask for user confirmation
confirm() {
    read -p "$1 (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled by user"
        exit 1
    fi
}

# Step 1: Load Environment Variables
print_step "1" "Loading Environment Configuration"
if [ -f "$ENV_FILE" ]; then
    source "$ENV_FILE"
    print_success "Environment loaded from $ENV_FILE"
else
    print_error "Environment file $ENV_FILE not found. Please create it first."
fi

# Validate required environment variables
if [ -z "$ENV_NAME" ] || [ -z "$ACCOUNT_ID" ] || [ -z "$REGION" ]; then
    print_error "Missing required environment variables: ENV_NAME, ACCOUNT_ID, REGION"
fi

echo "Environment: $ENV_NAME"
echo "Account: $ACCOUNT_ID"
echo "Region: $REGION"
echo ""

# Step 2: Pre-deployment Validation
print_step "2" "Running Pre-deployment Validation"
if [ -f "scripts/pre-deploy-checks.sh" ]; then
    export ENV_NAME ACCOUNT_ID REGION
    bash scripts/pre-deploy-checks.sh "$ENV_FILE"
    print_success "Pre-deployment validation passed"
else
    print_warning "Pre-deployment checks script not found, skipping..."
fi

# Step 3: Run Tests
print_step "3" "Running Infrastructure Tests"
npm test
print_success "All tests passed"

# Step 4: Generate CloudFormation Template
print_step "4" "Generating CloudFormation Template"
npm run cdk synth > /dev/null
print_success "CloudFormation template generated successfully"

# Step 5: Security Scan
print_step "5" "Security Configuration Review"
echo "Reviewing security settings..."

# Check for common security issues
SECURITY_ISSUES=0

# Check for hardcoded values
if grep -r "123456789012\|us-east-1" lib/ --include="*.ts" > /dev/null 2>&1; then
    print_warning "Found hardcoded account/region values in code"
    ((SECURITY_ISSUES++))
fi

# Check if WAF is enabled
if ! grep -q "wafv2.CfnWebACL" lib/order-infra-stack.ts; then
    print_warning "WAF protection not found"
    ((SECURITY_ISSUES++))
fi

if [ $SECURITY_ISSUES -eq 0 ]; then
    print_success "Security review completed - no critical issues found"
else
    print_warning "Security review found $SECURITY_ISSUES potential issues"
    confirm "Continue with deployment despite security warnings?"
fi

# Step 6: Clean Up Failed Stacks
print_step "6" "Checking for Failed Stacks"
STACK_NAME="OrderInfraStack-$ENV_NAME"
STACK_STATUS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "STACK_NOT_EXISTS")

if [[ "$STACK_STATUS" == *"FAILED"* ]] || [[ "$STACK_STATUS" == "ROLLBACK_COMPLETE" ]]; then
    print_warning "Found stack in failed state: $STACK_STATUS"
    confirm "Delete the failed stack before proceeding?"
    
    echo "Deleting failed stack..."
    aws cloudformation delete-stack --stack-name $STACK_NAME --region $REGION
    
    echo "Waiting for stack deletion to complete..."
    aws cloudformation wait stack-delete-complete --stack-name $STACK_NAME --region $REGION
    
    print_success "Failed stack deleted successfully"
elif [ "$STACK_STATUS" != "STACK_NOT_EXISTS" ]; then
    print_success "Existing stack status: $STACK_STATUS"
else
    print_success "No existing stack found - ready for new deployment"
fi

# Step 7: Deployment Confirmation
print_step "7" "Deployment Confirmation"
echo "Ready to deploy to:"
echo "• Environment: $ENV_NAME"
echo "• AWS Account: $ACCOUNT_ID"  
echo "• Region: $REGION"
echo "• Stack Name: OrderInfraStack-$ENV_NAME"
echo ""

# Show what will be deployed
echo "Resources to be created/updated:"
npm run cdk diff 2>/dev/null || echo "No changes detected or this is a new deployment"
echo ""

confirm "Proceed with deployment?"

# Step 8: AWS Configuration Verification  
print_step "8" "Verifying AWS Configuration"

# Check AWS credentials
CURRENT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "")
if [ "$CURRENT_ACCOUNT" != "$ACCOUNT_ID" ]; then
    print_error "AWS credentials don't match target account ($CURRENT_ACCOUNT vs $ACCOUNT_ID)"
fi

# Check CDK bootstrap
if ! aws cloudformation describe-stacks --stack-name CDKToolkit --region $REGION > /dev/null 2>&1; then
    print_warning "CDK not bootstrapped in region $REGION"
    confirm "Bootstrap CDK now?"
    npm run cdk bootstrap
fi

print_success "AWS configuration verified"

# Step 9: Backup Existing Stack (if exists)
print_step "9" "Backup Check"
STACK_NAME="OrderInfraStack-$ENV_NAME"
if aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION > /dev/null 2>&1; then
    print_warning "Stack $STACK_NAME already exists - this will update existing resources"
    
    # Create backup of current stack template
    BACKUP_FILE="backups/stack-backup-$(date +%Y%m%d-%H%M%S).json"
    mkdir -p backups
    aws cloudformation get-template --stack-name $STACK_NAME --region $REGION > $BACKUP_FILE 2>/dev/null || true
    
    if [ -f "$BACKUP_FILE" ]; then
        print_success "Stack template backed up to $BACKUP_FILE"
    fi
    
    confirm "Continue with stack update?"
else
    print_success "New stack deployment - no backup needed"
fi

# Step 10: Deploy
print_step "10" "Deploying Infrastructure"
echo "Starting deployment..."

# Store deployment start time
DEPLOY_START=$(date +%s)

# Deploy with error handling
if npx cdk deploy --require-approval never; then
    DEPLOY_END=$(date +%s)
    DEPLOY_TIME=$((DEPLOY_END - DEPLOY_START))
    
    print_success "Deployment completed successfully in ${DEPLOY_TIME} seconds!"
    
    # Get stack outputs
    echo ""
    echo "Stack Outputs:"
    echo "=================="
    aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --region $REGION \
        --query 'Stacks[0].Outputs' \
        --output table 2>/dev/null || echo "Could not retrieve stack outputs"
        
else
    print_error "Deployment failed!"
fi

# Step 11: Post-deployment Validation
print_step "11" "Post-deployment Validation"

# Check if stack is in good state
STACK_STATUS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo "UNKNOWN")

if [[ "$STACK_STATUS" == *"COMPLETE"* ]]; then
    print_success "Stack status: $STACK_STATUS"
else
    print_warning "Stack status: $STACK_STATUS"
fi

# Test API endpoint if available
API_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' --output text 2>/dev/null || echo "")

if [ ! -z "$API_URL" ]; then
    echo "Testing API endpoint..."
    if curl -s -o /dev/null -w "%{http_code}" "$API_URL/orders" | grep -q "200\|403\|404"; then
        print_success "API endpoint is responding"
    else
        print_warning "API endpoint may not be ready yet"
    fi
fi

# Step 12: Summary
print_step "12" "Deployment Summary"
echo "Deployment Summary"
echo "===================="
echo "Environment: $ENV_NAME"
echo "Stack: $STACK_NAME"
echo "Region: $REGION"
echo "Status: $STACK_STATUS"
if [ ! -z "$API_URL" ]; then
    echo "API URL: $API_URL"
fi
echo ""
echo "Next Steps:"
echo "1. Test your API endpoints"
echo "2. Monitor CloudWatch logs and metrics"
echo "3. Review costs in AWS Cost Explorer"
echo "4. Set up alerts for production monitoring"
echo ""
echo "Useful Commands:"
echo "• View logs: aws logs tail /aws/lambda/practice-order-processor-function --region $REGION"
echo "• Monitor costs: aws ce get-cost-and-usage --time-period Start=\$(date -d '1 month ago' +%Y-%m-%d),End=\$(date +%Y-%m-%d) --granularity MONTHLY --metrics BlendedCost"
echo "• Stack events: aws cloudformation describe-stack-events --stack-name $STACK_NAME --region $REGION"
echo ""

print_success "Deployment completed successfully!" 