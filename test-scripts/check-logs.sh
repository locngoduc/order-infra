#!/bin/bash

# Script to check CloudWatch logs for Order Processing System
# Make sure you have AWS CLI configured

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE} CloudWatch Logs Checker for Order Processing System${NC}"
echo "=================================================================="

# Function to check logs for a specific log group
check_logs() {
    local log_group="$1"
    local service_name="$2"
    
    echo -e "${YELLOW} Checking logs for ${service_name}${NC}"
    echo "Log Group: ${log_group}"
    
    # Get the latest log streams
    echo "Getting recent log streams..."
    aws logs describe-log-streams \
        --log-group-name "${log_group}" \
        --order-by LastEventTime \
        --descending \
        --limit 5 \
        --output table \
        --query 'logStreams[*].[logStreamName,lastEventTime,lastIngestionTime]'
    
    echo ""
    
    # Get recent log events (last 10 minutes)
    echo "Recent log events (last 10 minutes):"
    aws logs filter-log-events \
        --log-group-name "${log_group}" \
        --start-time $(($(date +%s) * 1000 - 600000)) \
        --query 'events[*].[timestamp,message]' \
        --output table
    
    echo ""
    echo "=================================================================="
    echo ""
}

# Check if AWS CLI is available
if ! command -v aws &> /dev/null; then
    echo -e "${RED} AWS CLI is not installed or not in PATH${NC}"
    echo "Please install AWS CLI and configure it with your credentials"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED} AWS credentials not configured${NC}"
    echo "Please run 'aws configure' to set up your credentials"
    exit 1
fi

echo -e "${GREEN} AWS CLI configured successfully${NC}"
echo ""

# Log groups for the Order Processing System
API_LAMBDA_LOG_GROUP="/aws/lambda/practice-api-lambda-function"
ORDER_PROCESSOR_LOG_GROUP="/aws/lambda/practice-order-processor-function"
S3_STORAGE_LOG_GROUP="/aws/lambda/practice-s3-storage-function"
STEP_FUNCTIONS_LOG_GROUP="/aws/stepfunctions/practice-order-workflow"

# Check logs for each service
check_logs "${API_LAMBDA_LOG_GROUP}" "API Gateway Lambda"
check_logs "${ORDER_PROCESSOR_LOG_GROUP}" "Order Processor Lambda"
check_logs "${S3_STORAGE_LOG_GROUP}" "S3 Storage Lambda"
check_logs "${STEP_FUNCTIONS_LOG_GROUP}" "Step Functions"

echo -e "${BLUE} Additional commands you can run:${NC}"
echo ""
echo "1. Watch real-time logs for API Lambda:"
echo "   aws logs tail ${API_LAMBDA_LOG_GROUP} --follow"
echo ""
echo "2. Watch real-time logs for Order Processor:"
echo "   aws logs tail ${ORDER_PROCESSOR_LOG_GROUP} --follow"
echo ""
echo "3. Watch real-time logs for S3 Storage:"
echo "   aws logs tail ${S3_STORAGE_LOG_GROUP} --follow"
echo ""
echo "4. Watch real-time logs for Step Functions:"
echo "   aws logs tail ${STEP_FUNCTIONS_LOG_GROUP} --follow"
echo ""
echo "5. Filter logs by specific pattern (example):"
echo "   aws logs filter-log-events --log-group-name ${ORDER_PROCESSOR_LOG_GROUP} --filter-pattern \"ERROR\""
echo ""
echo -e "${GREEN} Log checking completed!${NC}" 