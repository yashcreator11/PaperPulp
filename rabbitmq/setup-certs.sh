#!/bin/bash
set -e

CERT_DIR=/certs
mkdir -p $CERT_DIR

echo "🔐 Generating TLS certificates if missing..."

# 1️⃣ Generate CA
if [ ! -f "$CERT_DIR/ca.key" ] || [ ! -f "$CERT_DIR/ca.crt" ]; then
  openssl req -x509 -newkey rsa:4096 -days 365 -nodes \
    -keyout "$CERT_DIR/ca.key" \
    -out "$CERT_DIR/ca.crt" \
    -subj "/CN=rabbitmq-ca"
fi

# 2️⃣ Generate server cert
if [ ! -f "$CERT_DIR/server.key" ] || [ ! -f "$CERT_DIR/server.crt" ]; then
  openssl req -newkey rsa:4096 -nodes \
    -keyout "$CERT_DIR/server.key" \
    -out "$CERT_DIR/server.csr" \
    -subj "/CN=rabbitmq"

  openssl x509 -req \
    -in "$CERT_DIR/server.csr" \
    -CA "$CERT_DIR/ca.crt" \
    -CAkey "$CERT_DIR/ca.key" \
    -CAcreateserial \
    -out "$CERT_DIR/server.crt" \
    -days 365
fi

echo "🔐 Fixing permissions..."


chown -R rabbitmq:rabbitmq $CERT_DIR
chmod 600 $CERT_DIR/server.key
chmod 600 $CERT_DIR/ca.key
chmod 644 $CERT_DIR/server.crt
chmod 644 $CERT_DIR/ca.crt

echo "🚀 Starting RabbitMQ..."


exec /usr/local/bin/docker-entrypoint.sh rabbitmq-server