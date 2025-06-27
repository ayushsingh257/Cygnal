import os
from datetime import datetime
import json
from flask import request
import socket
import boto3
import logging
from botocore.exceptions import BotoCoreError, ClientError

# ========== AUDIT LOGGER (Phase 23.3) ==========

# Config flags (you can move these to config.py or .env later)
ENABLE_SYSLOG = True
ENABLE_CLOUDWATCH = True

# Syslog settings
SYSLOG_HOST = "localhost"
SYSLOG_PORT = 514

# CloudWatch settings
CLOUDWATCH_GROUP = "CygnalAuditLogs"
CLOUDWATCH_STREAM = "AuditTrail"

cloudwatch_client = None

if ENABLE_CLOUDWATCH:
    try:
        cloudwatch_client = boto3.client("logs", region_name="us-east-1")  # Change region if needed

        # Ensure log group exists
        groups = cloudwatch_client.describe_log_groups(logGroupNamePrefix=CLOUDWATCH_GROUP)
        if not any(g['logGroupName'] == CLOUDWATCH_GROUP for g in groups.get("logGroups", [])):
            cloudwatch_client.create_log_group(logGroupName=CLOUDWATCH_GROUP)

        # Ensure log stream exists
        streams = cloudwatch_client.describe_log_streams(logGroupName=CLOUDWATCH_GROUP, logStreamNamePrefix=CLOUDWATCH_STREAM)
        if not any(s['logStreamName'] == CLOUDWATCH_STREAM for s in streams.get("logStreams", [])):
            cloudwatch_client.create_log_stream(logGroupName=CLOUDWATCH_GROUP, logStreamName=CLOUDWATCH_STREAM)

    except (BotoCoreError, ClientError) as e:
        print("[CloudWatch Setup Error]", str(e))
        ENABLE_CLOUDWATCH = False


def get_client_ip():
    """
    Get the client's IP address considering proxy headers if present.
    """
    forwarded_for = request.headers.get("X-Forwarded-For", request.remote_addr)
    return forwarded_for.split(',')[0].strip()


def audit_log(tool: str, user: str, input_data, result_data):
    """
    Append a structured audit log to audit_logs/audit_log.json
    and forward to Syslog and CloudWatch if enabled.
    """
    try:
        os.makedirs("audit_logs", exist_ok=True)

        log_entry = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "ip": get_client_ip(),
            "user": user,
            "tool": tool,
            "input": input_data,
            "result": result_data,
        }

        # Save locally
        with open("audit_logs/audit_log.json", "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry) + "\n")

        # Send to syslog
        if ENABLE_SYSLOG:
            try:
                message = f"Cygnal | {log_entry['timestamp']} | {user} | {tool} | IP: {log_entry['ip']}"
                sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                sock.sendto(message.encode(), (SYSLOG_HOST, SYSLOG_PORT))
            except Exception as e:
                print(f"[Syslog Error] {e}")

        # Send to CloudWatch
        if ENABLE_CLOUDWATCH and cloudwatch_client:
            try:
                # Get sequence token
                streams = cloudwatch_client.describe_log_streams(logGroupName=CLOUDWATCH_GROUP, logStreamNamePrefix=CLOUDWATCH_STREAM)
                token = streams['logStreams'][0].get('uploadSequenceToken')

                cloudwatch_client.put_log_events(
                    logGroupName=CLOUDWATCH_GROUP,
                    logStreamName=CLOUDWATCH_STREAM,
                    logEvents=[{
                        'timestamp': int(datetime.utcnow().timestamp() * 1000),
                        'message': json.dumps(log_entry)
                    }],
                    sequenceToken=token
                )
            except (BotoCoreError, ClientError) as e:
                print("[CloudWatch Error]", str(e))

    except Exception as e:
        print(f"[AUDIT LOGGING ERROR]: {e}")
