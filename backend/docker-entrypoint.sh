#!/bin/sh
set -e

if [ -n "$DB_PASSWORD_FILE" ] && [ -f "$DB_PASSWORD_FILE" ]; then
  export DB_PASSWORD="$(cat "$DB_PASSWORD_FILE")"
fi

if [ -n "$JWT_SECRET_FILE" ] && [ -f "$JWT_SECRET_FILE" ]; then
  export JWT_SECRET="$(cat "$JWT_SECRET_FILE")"
fi

exec "$@"
