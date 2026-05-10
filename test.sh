#!/bin/bash

# 快速测试脚本
BASE_URL="http://localhost:3001"
COOKIES="/tmp/test-cookies-$$"

echo "🧪 Zhurong Agent 测试脚本"
echo "========================"

# 检查服务器是否运行
echo ""
echo "1️⃣ 检查服务器状态..."
if curl -s --connect-timeout 2 "$BASE_URL" > /dev/null 2>&1; then
    echo "✅ 服务器运行中"
else
    echo "❌ 服务器未运行，请先执行 npm run dev"
    exit 1
fi

# 注册测试用户
echo ""
echo "2️⃣ 注册测试用户..."
RANDOM_EMAIL="test$RANDOM@example.com"
REGISTER_RESULT=$(curl -s -c "$COOKIES" -X POST "$BASE_URL/api/auth/sign-up/email" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$RANDOM_EMAIL\",\"password\":\"testpass123\",\"name\":\"Test User\"}")

if echo "$REGISTER_RESULT" | grep -q '"token"'; then
    echo "✅ 注册成功: $RANDOM_EMAIL"
else
    echo "❌ 注册失败: $REGISTER_RESULT"
    exit 1
fi

# 测试聊天
echo ""
echo "3️⃣ 测试聊天 API..."
CHAT_RESULT=$(curl -s -b "$COOKIES" -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"说一个字：好"}' \
  --max-time 60)

if echo "$CHAT_RESULT" | grep -q '"type":"complete"'; then
    echo "✅ 聊天 API 正常"
    SESSION_ID=$(echo "$CHAT_RESULT" | grep -o '"sessionId":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "   Session ID: $SESSION_ID"
else
    echo "❌ 聊天 API 失败"
fi

# 测试多轮对话
echo ""
echo "4️⃣ 测试多轮对话..."
CHAT_RESULT2=$(curl -s -b "$COOKIES" -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"prompt\":\"我刚才说了什么\",\"sessionId\":\"$SESSION_ID\"}" \
  --max-time 60)

if echo "$CHAT_RESULT2" | grep -q '"type":"complete"'; then
    echo "✅ 多轮对话正常"
else
    echo "❌ 多轮对话失败"
fi

# 测试 Skills
echo ""
echo "5️⃣ 测试 Skills..."
CHAT_RESULT3=$(curl -s -b "$COOKIES" -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"使用 example skill","skills":["example-skill"]}' \
  --max-time 60)

if echo "$CHAT_RESULT3" | grep -q 'example'; then
    echo "✅ Skills 调用正常"
else
    echo "❌ Skills 调用失败"
fi

# 测试未认证访问
echo ""
echo "6️⃣ 测试认证保护..."
UNAUTH_RESULT=$(curl -s -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"test"}')

if echo "$UNAUTH_RESULT" | grep -q 'Unauthorized'; then
    echo "✅ 认证保护正常"
else
    echo "❌ 认证保护失败"
fi

# 清理
rm -f "$COOKIES"

echo ""
echo "========================"
echo "🎉 测试完成！"
