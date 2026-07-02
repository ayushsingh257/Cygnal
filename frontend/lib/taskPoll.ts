export async function pollTask(
  taskId: string,
  onProgress: (pct: number) => void,
  intervalMs: number = 1000
): Promise<any> {
  const token = localStorage.getItem("cygnal_token");
  return new Promise((resolve, reject) => {
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/task/${taskId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (!data.success) {
          clearInterval(timer);
          reject(new Error(data.error || "Failed to fetch task status"));
          return;
        }

        const task = data.task;
        onProgress(task.progress);

        if (task.status === "complete") {
          clearInterval(timer);
          resolve(task.result);
        } else if (task.status === "error") {
          clearInterval(timer);
          reject(new Error(task.error || "Task execution failed"));
        }
      } catch (err) {
        clearInterval(timer);
        reject(err);
      }
    }, intervalMs);
  });
}
