#!/bin/bash
# 端到端冒烟测试：覆盖认证、隔离、发布、公开访问、静态化、运营端点
# 运行：bash test/e2e.sh   （需先启动 PostgreSQL、后端、站点渲染器）
set -e

API=http://localhost:3000/api
SITE=http://localhost:3001
PASS=0; FAIL=0

check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "  ✓ $name ($actual)"; PASS=$((PASS+1))
  else
    echo "  ✗ $name expected=$expected actual=$actual"; FAIL=$((FAIL+1))
  fi
}

echo "=== 1. 认证 ==="
LOGIN=$(curl -s $API/auth/login -X POST -H 'Content-Type: application/json' \
  -d '{"email":"user@demo.com","password":"demo123"}')
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json;print(json.load(sys.stdin).get('accessToken',''))")
check "登录返回 token" "yes" "$([ -n "$TOKEN" ] && echo yes || echo no)"

echo "=== 2. 鉴权与隔离 ==="
check "未登录访问站点" "401" "$(curl -s -o /dev/null -w '%{http_code}' $API/sites)"
ADMIN_TOKEN=$(curl -s $API/auth/login -X POST -H 'Content-Type: application/json' \
  -d '{"email":"admin@sitebuilder.io","password":"admin123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['accessToken'])")
check "超管租户列表" "200" "$(curl -s -o /dev/null -w '%{http_code}' $API/tenants -H "Authorization: Bearer $ADMIN_TOKEN")"
check "普通用户访问超管端点" "403" "$(curl -s -o /dev/null -w '%{http_code}' $API/tenants -H "Authorization: Bearer $TOKEN")"

echo "=== 3. 站点与发布 ==="
SITES=$(curl -s $API/sites -H "Authorization: Bearer $TOKEN")
SITE_ID=$(echo "$SITES" | python3 -c "import sys,json;print(json.load(sys.stdin)[0]['id'])")
MARKER="E2E-$(date +%s)"
curl -s $API/sites/$SITE_ID/draft -X PUT -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"schema\":{\"version\":1,\"meta\":{\"title\":\"$MARKER\"},\"theme\":{\"primary\":\"#171717\",\"accent\":\"#D4AF37\",\"background\":\"#ffffff\",\"text\":\"#171717\",\"muted\":\"#475569\",\"radius\":8},\"root\":{\"id\":\"root\",\"type\":\"container\",\"props\":{\"padding\":40},\"children\":[{\"id\":\"h\",\"type\":\"heading\",\"props\":{\"text\":\"$MARKER\",\"level\":\"h1\",\"align\":\"center\"}}]}}}" >/dev/null
PUBLISH=$(curl -s $API/sites/$SITE_ID/publish -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"note":"e2e"}')
check "发布返回版本号" "yes" "$(echo "$PUBLISH" | python3 -c "import sys,json;print('yes' if json.load(sys.stdin).get('version') else 'no')")"
check "发布返回静态URL" "yes" "$(echo "$PUBLISH" | python3 -c "import sys,json;print('yes' if json.load(sys.stdin).get('staticUrl') else 'no')")"

echo "=== 4. 公开访问 ==="
check "后端 DSL" "200" "$(curl -s -o /dev/null -w '%{http_code}' $API/s/demo/my-site)"
check "Next.js SSR" "200" "$(curl -s -o /dev/null -w '%{http_code}' $SITE/s/demo/my-site)"
check "SSR 内容含标记" "yes" "$(curl -s $SITE/s/demo/my-site | grep -q "$MARKER" && echo yes || echo no)"
check "泛域名" "yes" "$(curl -s -H 'Host: demo.localhost:3001' $SITE/ | grep -q "$MARKER" && echo yes || echo no)"
check "未知站点 404" "404" "$(curl -s -o /dev/null -w '%{http_code}' $SITE/s/demo/nonexistent-xyz)"

echo "=== 5. 静态化 ==="
STATIC=$(echo "$PUBLISH" | python3 -c "import sys,json;print(json.load(sys.stdin).get('staticUrl') or '')")
check "静态文件可访问" "200" "$(curl -s -o /dev/null -w '%{http_code}' "$STATIC")"
HTML_CONTENT=$(curl -s "$STATIC")
check "静态HTML含标记" "yes" "$(echo "$HTML_CONTENT" | grep -q "$MARKER" && echo yes || echo no)"
check "静态HTML无脚本" "yes" "$(echo "$HTML_CONTENT" | grep -q '<script' && echo no || echo yes)"

echo "=== 6. 小程序端点 ==="
MP=$(curl -s $API/mp/demo/my-site)
check "小程序返回标题" "yes" "$(echo "$MP" | python3 -c "import sys,json;d=json.load(sys.stdin);print('yes' if d.get('title') else 'no')")"
check "小程序返回精简节点" "yes" "$(echo "$MP" | python3 -c "import sys,json;d=json.load(sys.stdin);print('yes' if d.get('page',{}).get('type') else 'no')")"

echo "=== 7. 运营端点 ==="
for ep in pages domains submissions stats billing/plans coupons campaigns members products distributors audit; do
  check "GET $ep" "200" "$(curl -s -o /dev/null -w '%{http_code}' $API/$ep -H "Authorization: Bearer $TOKEN")"
done

echo "=== 8. 安全头与限流 ==="
check "安全头 X-Content-Type-Options" "nosniff" "$(curl -sI $API/billing/plans -H "Authorization: Bearer $TOKEN" | grep -i 'x-content-type-options' | tr -d '\r' | awk '{print $2}')"

echo ""
echo "========================"
echo "通过: $PASS  失败: $FAIL"
echo "========================"
[ "$FAIL" -eq 0 ]
