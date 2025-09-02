#!/bin/bash

# Test Push Notification Script
# Usage: ./test-push.sh "ExponentPushToken[xxxxx]" "Title" "Body"

TOKEN=${1:-""}
TITLE=${2:-"Test Notification"}
BODY=${3:-"This is a test push notification from Fuzzy!"}

if [ -z "$TOKEN" ]; then
    echo "Usage: ./test-push.sh <expo-push-token> [title] [body]"
    echo "Example: ./test-push.sh \"ExponentPushToken[xxxxx]\" \"Hello\" \"Test message\""
    exit 1
fi

echo "Sending notification to: $TOKEN"
echo "Title: $TITLE"
echo "Body: $BODY"
echo ""

curl -X POST http://localhost:3000/send-notification \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "token": "$TOKEN",
  "title": "$TITLE",  
  "body": "$BODY",
  "data": {
    "type": "test",
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  }
}
EOF

echo ""
echo "Notification sent!"