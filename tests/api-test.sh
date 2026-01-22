#!/bin/bash

# API Test Script for Requests (タスク・依頼管理システム)
# ============================================================

BASE_URL="http://localhost:8080/api"
COOKIE_FILE="/tmp/test_cookies.txt"
PASS=0
FAIL=0
TOTAL=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test helper functions
print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_subheader() {
    echo ""
    echo -e "${YELLOW}▶ $1${NC}"
}

test_api() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected="$5"
    
    TOTAL=$((TOTAL + 1))
    
    if [ "$method" == "GET" ]; then
        response=$(curl -s -b "$COOKIE_FILE" -c "$COOKIE_FILE" "${BASE_URL}${endpoint}")
    elif [ "$method" == "POST" ]; then
        response=$(curl -s -b "$COOKIE_FILE" -c "$COOKIE_FILE" -X POST -H "Content-Type: application/json" -d "$data" "${BASE_URL}${endpoint}")
    elif [ "$method" == "PUT" ]; then
        response=$(curl -s -b "$COOKIE_FILE" -c "$COOKIE_FILE" -X PUT -H "Content-Type: application/json" -d "$data" "${BASE_URL}${endpoint}")
    elif [ "$method" == "DELETE" ]; then
        response=$(curl -s -b "$COOKIE_FILE" -c "$COOKIE_FILE" -X DELETE "${BASE_URL}${endpoint}")
    fi
    
    if echo "$response" | grep -q "$expected"; then
        echo -e "  ${GREEN}✓${NC} #$TOTAL $test_name"
        PASS=$((PASS + 1))
        return 0
    else
        echo -e "  ${RED}✗${NC} #$TOTAL $test_name"
        echo -e "    ${RED}Expected: $expected${NC}"
        echo -e "    ${RED}Got: ${response:0:200}${NC}"
        FAIL=$((FAIL + 1))
        return 1
    fi
}

# Clean up previous cookies
rm -f "$COOKIE_FILE"

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Requests API テストスイート                            ║${NC}"
echo -e "${BLUE}║       タスク・依頼管理システム                               ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"

# ============================================================
# 1. Authentication Tests
# ============================================================
print_header "🔐 認証機能テスト"

print_subheader "未認証状態でのアクセス"
test_api "認証なしでタスク取得は失敗" "GET" "/tasks" "" "UNAUTHORIZED"

print_subheader "ログイン"
test_api "無効な認証情報でログイン失敗" "POST" "/auth/login" '{"email":"invalid@test.com","password":"wrong"}' "INVALID_CREDENTIALS"
test_api "管理者でログイン成功" "POST" "/auth/login" '{"email":"admin@example.com","password":"admin123"}' "success"

print_subheader "認証状態の確認"
test_api "ログイン後にユーザー情報取得" "GET" "/auth/me" "" "admin@example.com"

# ============================================================
# 2. Department Tests (Admin)
# ============================================================
print_header "🏢 部署管理テスト（管理者）"

print_subheader "部署一覧"
test_api "部署一覧取得" "GET" "/departments" "" "success"

print_subheader "部署CRUD"
test_api "部署作成" "POST" "/departments" '{"name":"テスト部署","color":"#FF5733"}' "success"

# Get the created department ID (look for newest department with test name)
DEPT_RESPONSE=$(curl -s -b "$COOKIE_FILE" "${BASE_URL}/departments")
# Extract ID that comes before "テスト部署"
TEST_DEPT_ID=$(echo "$DEPT_RESPONSE" | sed 's/},{/}\n{/g' | grep 'テスト部署' | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -n "$TEST_DEPT_ID" ]; then
    test_api "部署取得（ID: $TEST_DEPT_ID）" "GET" "/departments/$TEST_DEPT_ID" "" "テスト部署"
    test_api "部署更新" "PUT" "/departments/$TEST_DEPT_ID" '{"name":"テスト部署更新","color":"#33FF57"}' "success"
    test_api "部署削除" "DELETE" "/departments/$TEST_DEPT_ID" "" "success"
else
    echo -e "  ${YELLOW}⚠${NC} 部署IDの取得に失敗（テストスキップ）"
    echo -e "    ${YELLOW}Response: ${DEPT_RESPONSE:0:300}${NC}"
fi

# ============================================================
# 3. Category Tests
# ============================================================
print_header "🏷️ カテゴリ管理テスト"

print_subheader "カテゴリ一覧"
test_api "カテゴリ一覧取得" "GET" "/categories" "" "success"

print_subheader "カテゴリCRUD"
test_api "カテゴリ作成" "POST" "/categories" '{"name":"テストカテゴリ","color":"#9933FF"}' "success"

# Get category ID
CAT_RESPONSE=$(curl -s -b "$COOKIE_FILE" "${BASE_URL}/categories")
TEST_CAT_ID=$(echo "$CAT_RESPONSE" | sed 's/},{/}\n{/g' | grep 'テストカテゴリ' | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -n "$TEST_CAT_ID" ]; then
    test_api "カテゴリ更新" "PUT" "/categories/$TEST_CAT_ID" '{"name":"テストカテゴリ更新","color":"#FF3399"}' "success"
    test_api "カテゴリ削除" "DELETE" "/categories/$TEST_CAT_ID" "" "success"
else
    echo -e "  ${YELLOW}⚠${NC} カテゴリIDの取得に失敗（スキップ）"
fi

# ============================================================
# 4. User Tests
# ============================================================
print_header "👤 ユーザー管理テスト"

print_subheader "ユーザー一覧"
test_api "ユーザー一覧取得" "GET" "/users" "" "success"
test_api "内部ユーザー一覧取得" "GET" "/users?type=internal" "" "success"
test_api "クライアント一覧取得" "GET" "/users?type=client" "" "success"

print_subheader "ユーザーCRUD"
test_api "ユーザー作成" "POST" "/users" '{"name":"テストユーザー","email":"test-user@example.com","password":"password123","role":"staff","type":"internal"}' "success"

# Get user ID
USER_RESPONSE=$(curl -s -b "$COOKIE_FILE" "${BASE_URL}/users")
TEST_USER_ID=$(echo "$USER_RESPONSE" | sed 's/},{/}\n{/g' | grep 'テストユーザー' | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -n "$TEST_USER_ID" ]; then
    test_api "ユーザー取得（ID: $TEST_USER_ID）" "GET" "/users/$TEST_USER_ID" "" "テストユーザー"
    test_api "ユーザー更新" "PUT" "/users/$TEST_USER_ID" '{"name":"テストユーザー更新","email":"test-user@example.com","role":"staff","type":"internal"}' "success"
    test_api "ユーザー削除" "DELETE" "/users/$TEST_USER_ID" "" "success"
else
    echo -e "  ${YELLOW}⚠${NC} ユーザーIDの取得に失敗（スキップ）"
fi

# ============================================================
# 5. Task Tests
# ============================================================
print_header "📋 タスク管理テスト"

print_subheader "タスク一覧"
test_api "タスク一覧取得" "GET" "/tasks" "" "success"
test_api "タスク一覧（カンバン）" "GET" "/tasks?grouped=status" "" "success"
test_api "タスク一覧（担当者別）" "GET" "/tasks?grouped=assignee" "" "success"
test_api "タスク一覧（部署別）" "GET" "/tasks?grouped=department" "" "success"

print_subheader "タスクCRUD"
test_api "タスク作成" "POST" "/tasks" '{"title":"テストタスク","description":"テスト説明","status":"pending","priority":"medium"}' "success"

# Get task ID
TASK_RESPONSE=$(curl -s -b "$COOKIE_FILE" "${BASE_URL}/tasks")
TEST_TASK_ID=$(echo "$TASK_RESPONSE" | sed 's/},{/}\n{/g' | grep 'テストタスク' | grep -o '"id":[0-9]*' | head -1 | grep -o '[0-9]*')

if [ -n "$TEST_TASK_ID" ]; then
    test_api "タスク取得（ID: $TEST_TASK_ID）" "GET" "/tasks/$TEST_TASK_ID" "" "テストタスク"
    test_api "タスク更新（ステータス変更）" "PUT" "/tasks/$TEST_TASK_ID" '{"title":"テストタスク","status":"in_progress","priority":"high"}' "success"
    test_api "タスク削除" "DELETE" "/tasks/$TEST_TASK_ID" "" "success"
else
    echo -e "  ${YELLOW}⚠${NC} タスクIDの取得に失敗（スキップ）"
fi

# ============================================================
# 6. Role-based Access Tests
# ============================================================
print_header "🔒 権限テスト"

# Logout admin
curl -s -b "$COOKIE_FILE" -c "$COOKIE_FILE" -X POST "${BASE_URL}/auth/logout" > /dev/null

print_subheader "スタッフ権限"
test_api "スタッフでログイン" "POST" "/auth/login" '{"email":"tanaka@example.com","password":"admin123"}' "success"
test_api "スタッフがタスク取得" "GET" "/tasks" "" "success"
test_api "スタッフが部署一覧取得" "GET" "/departments" "" "success"

# Try to create user (should fail for staff)
STAFF_USER_CREATE=$(curl -s -b "$COOKIE_FILE" -X POST -H "Content-Type: application/json" -d '{"name":"不正ユーザー","email":"invalid@test.com","password":"test123","role":"staff","type":"internal"}' "${BASE_URL}/users")
TOTAL=$((TOTAL + 1))
if echo "$STAFF_USER_CREATE" | grep -q "FORBIDDEN\|UNAUTHORIZED"; then
    echo -e "  ${GREEN}✓${NC} #$TOTAL スタッフはユーザー作成不可"
    PASS=$((PASS + 1))
else
    echo -e "  ${RED}✗${NC} #$TOTAL スタッフがユーザー作成できてしまった"
    echo -e "    ${RED}Response: ${STAFF_USER_CREATE:0:200}${NC}"
    FAIL=$((FAIL + 1))
fi

# Logout staff
curl -s -b "$COOKIE_FILE" -c "$COOKIE_FILE" -X POST "${BASE_URL}/auth/logout" > /dev/null

print_subheader "クライアント権限"
test_api "クライアントでログイン" "POST" "/auth/login" '{"email":"suzuki@client.example.com","password":"admin123"}' "success"
test_api "クライアントがタスク取得" "GET" "/tasks" "" "success"

# Logout client
curl -s -b "$COOKIE_FILE" -c "$COOKIE_FILE" -X POST "${BASE_URL}/auth/logout" > /dev/null

# ============================================================
# 7. Session Tests
# ============================================================
print_header "🍪 セッション管理テスト"

print_subheader "ログアウト後"
test_api "ログアウト後はタスク取得不可" "GET" "/tasks" "" "UNAUTHORIZED"

# ============================================================
# Summary
# ============================================================
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  テスト結果サマリー${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  合計:   ${TOTAL} テスト"
echo -e "  ${GREEN}成功:   ${PASS} テスト${NC}"
echo -e "  ${RED}失敗:   ${FAIL} テスト${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    ✓ ALL TESTS PASSED!                       ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                    ✗ SOME TESTS FAILED                       ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
