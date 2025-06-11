#!/bin/bash

# Test script for Order Processing API
# Run this after deploying your CDK stack

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE} Testing Order Processing API${NC}"
echo "=================================================="

# Check if API_URL is provided as argument
if [ -z "$1" ]; then
    echo -e "${RED} Error: Please provide API Gateway URL as first argument${NC}"
    echo "Usage: ./test-api.sh <API_GATEWAY_URL>"
    echo "Example: ./test-api.sh https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod"
    exit 1
fi

API_URL="$1"
ORDERS_ENDPOINT="${API_URL}/orders"

echo -e "${YELLOW} Testing endpoint: ${ORDERS_ENDPOINT}${NC}"
echo ""

# Test 1: Simple order
echo -e "${BLUE} Test 1: Simple Order${NC}"
echo "Request:"
cat << 'EOF'
{
  "customerName": "John Doe",
  "items": [
    {"name": "Laptop", "price": 999.99, "quantity": 1},
    {"name": "Mouse", "price": 29.99, "quantity": 2}
  ],
  "totalAmount": 1059.97
}
EOF

echo ""
echo "Response:"
curl -X POST "${ORDERS_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "John Doe",
    "items": [
      {"name": "Laptop", "price": 999.99, "quantity": 1},
      {"name": "Mouse", "price": 29.99, "quantity": 2}
    ],
    "totalAmount": 1059.97
  }' \
  | jq '.'

echo ""
echo "=================================================="

# Test 2: Order with custom ID
echo -e "${BLUE} Test 2: Order with Custom ID${NC}"
CUSTOM_ORDER_ID="order-$(date +%s)"
echo "Request:"
cat << EOF
{
  "orderId": "${CUSTOM_ORDER_ID}",
  "customerName": "Jane Smith",
  "items": [
    {"name": "Phone", "price": 699.99, "quantity": 1}
  ],
  "totalAmount": 699.99,
  "priority": "high"
}
EOF

echo ""
echo "Response:"
curl -X POST "${ORDERS_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d "{
    \"orderId\": \"${CUSTOM_ORDER_ID}\",
    \"customerName\": \"Jane Smith\",
    \"items\": [
      {\"name\": \"Phone\", \"price\": 699.99, \"quantity\": 1}
    ],
    \"totalAmount\": 699.99,
    \"priority\": \"high\"
  }" \
  | jq '.'

echo ""
echo "=================================================="

# Test 3: Empty order (edge case)
echo -e "${BLUE} Test 3: Empty Order (Edge Case)${NC}"
echo "Request: {}"
echo ""
echo "Response:"
curl -X POST "${ORDERS_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{}' \
  | jq '.'

echo ""
echo "=================================================="

# Test 4: GET request
echo -e "${BLUE} Test 4: GET Request${NC}"
echo "Response:"
curl -X GET "${ORDERS_ENDPOINT}" | jq '.'

echo ""
echo -e "${GREEN} Testing completed!${NC}"
echo ""
echo -e "${YELLOW} Next steps:${NC}"
echo "1. Check CloudWatch Logs for detailed execution logs"
echo "2. Monitor Step Functions executions in AWS Console"
echo "3. Verify S3 bucket for stored order files"
echo "4. Check CloudWatch Dashboard for metrics" 