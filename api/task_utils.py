import os
from threading import Thread

USE_CELERY = os.getenv("USE_CELERY", "").lower() == "true" or bool(os.getenv("DATABASE_URL"))

def dispatch_investigation(app, job_id, case_id, target, input_type, token, user, file_bytes=None, filename=None):
    """
    Dispatches the background worker job, routing through Celery if configured,
    or falling back to standard threading.Thread if broker is unavailable.
    """
    if USE_CELERY:
        try:
            from celery_app import run_investigation_task
            import base64
            
            file_bytes_b64 = None
            if file_bytes:
                if isinstance(file_bytes, bytes):
                    file_bytes_b64 = base64.b64encode(file_bytes).decode("utf-8")
                else:
                    file_bytes_b64 = file_bytes
            
            run_investigation_task.delay(
                job_id, case_id, target, input_type, token, user, file_bytes_b64, filename
            )
            print(f"[TASK_UTILS] Dispatched job {job_id} successfully via Celery.")
            return
        except Exception as e:
            print(f"[TASK_UTILS] Failed to dispatch via Celery: {str(e)}. Falling back to threading.")
            
    # Fallback: run in background thread
    from services.orchestrator import run_investigation_worker
    import base64
    
    # Ensure file_bytes is bytes for the threading worker if base64 string was passed
    if file_bytes and isinstance(file_bytes, str):
        try:
            file_bytes = base64.b64decode(file_bytes.encode("utf-8"))
        except Exception:
            pass
            
    t = Thread(
        target=run_investigation_worker,
        args=(app, job_id, case_id, target, input_type, token, user, file_bytes, filename)
    )
    t.start()
    print(f"[TASK_UTILS] Dispatched job {job_id} successfully via background Thread.")
