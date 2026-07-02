import uuid
import threading
import logging
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

class BackgroundTaskManager:
    def __init__(self, max_workers=5):
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.tasks = {}  # taskId -> dict containing state
        self.lock = threading.Lock()

    def submit_task(self, name, func, *args, **kwargs):
        task_id = str(uuid.uuid4())
        with self.lock:
            self.tasks[task_id] = {
                "id": task_id,
                "name": name,
                "status": "pending",
                "progress": 0,
                "result": None,
                "error": None,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        
        def wrapper():
            try:
                self.update_task(task_id, status="running", progress=10)
                
                # Progress reporter callback passed into the function
                def progress_callback(pct):
                    self.update_task(task_id, progress=pct)
                
                # Add progress_callback to kwargs so function can update its progress
                kwargs["progress_callback"] = progress_callback
                
                result = func(*args, **kwargs)
                self.update_task(task_id, status="complete", progress=100, result=result)
            except Exception as e:
                self.update_task(task_id, status="error", error=str(e), progress=100)
                logging.error(f"Background task {name} ({task_id}) failed: {e}", exc_info=True)

        self.executor.submit(wrapper)
        return task_id

    def update_task(self, task_id, **kwargs):
        with self.lock:
            if task_id in self.tasks:
                self.tasks[task_id].update(kwargs)

    def get_task_status(self, task_id):
        with self.lock:
            return self.tasks.get(task_id)

    def get_all_tasks(self):
        with self.lock:
            # Return list of tasks sorted by timestamp descending
            return sorted(self.tasks.values(), key=lambda t: t["timestamp"], reverse=True)

# Global task manager instance
global_task_manager = BackgroundTaskManager()
