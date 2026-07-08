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

@celery.task(name="cygnal.run_investigation")
def run_investigation_task(job_id, case_id, target, input_type, token, user, file_bytes_b64=None, filename=None):
    from backend import app
    from services.orchestrator import run_investigation_worker
    import base64
    
    file_bytes = None
    if file_bytes_b64:
        try:
            file_bytes = base64.b64decode(file_bytes_b64.encode("utf-8"))
            print(f"[CELERY] Decoded base64 file attachment: {filename}")
        except Exception as e:
            print(f"[CELERY] Failed to decode base64 file bytes: {str(e)}")
            
    print(f"[CELERY] Starting background investigation task for job: {job_id}")
    with app.app_context():
        run_investigation_worker(
            app, job_id, case_id, target, input_type, token, user, file_bytes, filename
        )
    print(f"[CELERY] Completed background investigation task for job: {job_id}")

@celery.task(name="cygnal.process_inbound_alert")
def process_inbound_alert_task(alert_id):
    from backend import app
    from services.agent import run_autonomic_loop_worker
    
    print(f"[CELERY] Starting background autonomic alert process task for alert: {alert_id}")
    with app.app_context():
        run_autonomic_loop_worker(app, alert_id)
    print(f"[CELERY] Completed background autonomic alert process task for alert: {alert_id}")
