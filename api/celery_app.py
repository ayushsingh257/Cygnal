import os
from celery import Celery

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery = Celery(
    "cygnal_tasks",
    broker=REDIS_URL,
    backend=REDIS_URL
)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

@celery.task(
    name="cygnal.run_investigation",
    bind=True,
    max_retries=3,
    default_retry_delay=10,
    retry_backoff=True,
    retry_backoff_max=120,
    retry_jitter=True
)
def run_investigation_task(self, job_id, case_id, target, input_type, token, user, file_bytes_b64=None, filename=None, tenant_id=1):
    from backend import app
    from services.orchestrator import run_investigation_worker
    from db_utils import set_thread_tenant_id, clear_thread_tenant_id
    import base64
    
    # Bind tenant ID context to current background worker thread
    set_thread_tenant_id(tenant_id)
    
    file_bytes = None
    if file_bytes_b64:
        try:
            file_bytes = base64.b64decode(file_bytes_b64.encode("utf-8"))
            print(f"[CELERY] Decoded base64 file attachment: {filename}")
        except Exception as e:
            print(f"[CELERY] Failed to decode base64 file bytes: {str(e)}")
            
    print(f"[CELERY] Starting background investigation task for job: {job_id} (Tenant: {tenant_id})")
    try:
        with app.app_context():
            run_investigation_worker(
                app, job_id, case_id, target, input_type, token, user, file_bytes, filename
            )
        print(f"[CELERY] Completed background investigation task for job: {job_id}")
    except Exception as exc:
        print(f"[CELERY EXCEPTION] Job {job_id} failed: {str(exc)}")
        try:
            # Trigger celery retry with exponential backoff
            self.retry(exc=exc)
        except Exception as retry_exc:
            # DLQ: write final failure state to DB if retries are exhausted
            _handle_dlq(job_id, f"Celery retries exhausted. Original error: {str(exc)}. Retry error: {str(retry_exc)}")
    finally:
        clear_thread_tenant_id()

@celery.task(
    name="cygnal.process_inbound_alert",
    bind=True,
    max_retries=3,
    default_retry_delay=5,
    retry_backoff=True,
    retry_backoff_max=60,
    retry_jitter=True
)
def process_inbound_alert_task(self, alert_id, tenant_id=1):
    from backend import app
    from services.agent import run_autonomic_loop_worker
    from db_utils import set_thread_tenant_id, clear_thread_tenant_id
    
    # Bind tenant ID context to current background worker thread
    set_thread_tenant_id(tenant_id)
    
    print(f"[CELERY] Starting background autonomic alert process task for alert: {alert_id} (Tenant: {tenant_id})")
    try:
        with app.app_context():
            run_autonomic_loop_worker(app, alert_id)
        print(f"[CELERY] Completed background autonomic alert process task for alert: {alert_id}")
    except Exception as exc:
        print(f"[CELERY EXCEPTION] Alert process {alert_id} failed: {str(exc)}")
        try:
            self.retry(exc=exc)
        except Exception:
            _handle_alert_dlq(alert_id, str(exc))
    finally:
        clear_thread_tenant_id()

def _handle_dlq(job_id, error_message):
    """Dead-Letter Handler for failed forensic jobs."""
    from db_utils import get_db_connection
    import json
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE investigation_jobs SET status = 'failed', scanner_statuses = ? WHERE id = ?;",
            (json.dumps({"error": f"DLQ triggered: {error_message}"}), job_id)
        )
        conn.commit()
        conn.close()
        print(f"[CELERY DLQ] Job {job_id} sent to DLQ: {error_message}")
    except Exception as e:
        print(f"[CELERY DLQ ERROR] Failed to write DLQ for job {job_id}: {str(e)}")

def _handle_alert_dlq(alert_id, error_message):
    """Dead-Letter Handler for failed SIEM alert ingestions."""
    from db_utils import get_db_connection
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE inbound_alerts SET status = 'failed', description = ? WHERE id = ?;",
            (f"DLQ Failure: {error_message}", alert_id)
        )
        conn.commit()
        conn.close()
        print(f"[CELERY DLQ] Alert {alert_id} sent to DLQ: {error_message}")
    except Exception as e:
        print(f"[CELERY DLQ ERROR] Failed to write DLQ for alert {alert_id}: {str(e)}")
