#!/bin/bash

# HBM Service API Test Script
# Tests all endpoints and functionality

BASE_URL="http://localhost:3000"
API_BASE="$BASE_URL/api"

echo "🚀 Testing HBM Service API"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_status="$5"
    
    echo -e "\n${YELLOW}Testing: $name${NC}"
    echo "Endpoint: $method $endpoint"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "%{http_code}" "$endpoint")
        status_code="${response: -3}"
        body="${response%???}"
    else
        response=$(curl -s -w "%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$endpoint")
        status_code="${response: -3}"
        body="${response%???}"
    fi
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (Status: $status_code)"
        echo "$body" | jq . 2>/dev/null || echo "$body"
    else
        echo -e "${RED}✗ FAIL${NC} (Expected: $expected_status, Got: $status_code)"
        echo "$body"
    fi
}

# Health Checks
echo -e "\n📊 Health Check Endpoints"
test_endpoint "General Health Check" "GET" "$API_BASE/health" "" "200"
test_endpoint "Database Health Check" "GET" "$API_BASE/health/db" "" "200"

# Documentation
echo -e "\n📚 Documentation Endpoints"
test_endpoint "API Documentation Page" "GET" "$API_BASE/docs" "" "200"
test_endpoint "OpenAPI Specification" "GET" "$API_BASE/docs/openapi.json" "" "200"

# Users API - Valid Cases
echo -e "\n👥 Users API - Valid Cases"
test_endpoint "Get All Users" "GET" "$API_BASE/users" "" "200"
test_endpoint "Get Users with Pagination" "GET" "$API_BASE/users?page=1&limit=5" "" "200"
test_endpoint "Create New User" "POST" "$API_BASE/users" '{"name":"Test User","email":"test@example.com","age":25}' "201"

# Store user ID for further tests
USER_ID=$(curl -s -X POST -H "Content-Type: application/json" -d '{"name":"Temp User","email":"temp@example.com","age":30}' "$API_BASE/users" | jq -r '.data.id')

if [ "$USER_ID" != "null" ] && [ -n "$USER_ID" ]; then
    test_endpoint "Get Specific User" "GET" "$API_BASE/users/$USER_ID" "" "200"
fi

# Users API - Error Cases
echo -e "\n❌ Users API - Error Cases"
test_endpoint "Invalid User Creation (Empty Name)" "POST" "$API_BASE/users" '{"name":"","email":"invalid-email"}' "400"
test_endpoint "Invalid User Creation (Bad Email)" "POST" "$API_BASE/users" '{"name":"Valid Name","email":"not-an-email"}' "400"
test_endpoint "Get Non-existent User (Invalid UUID)" "GET" "$API_BASE/users/invalid-id" "" "400"
test_endpoint "Get Non-existent User (Valid UUID)" "GET" "$API_BASE/users/123e4567-e89b-12d3-a456-426614174999" "" "404"

# Non-existent Endpoints
echo -e "\n🔍 Error Handling"
test_endpoint "Non-existent Endpoint" "GET" "$API_BASE/nonexistent" "" "404"

echo -e "\n${GREEN}🎉 API Testing Complete!${NC}"
echo -e "\nℹ️  For interactive documentation, visit: $BASE_URL/api/docs"
echo -e "ℹ️  For OpenAPI spec, visit: $BASE_URL/api/docs/openapi.json"
