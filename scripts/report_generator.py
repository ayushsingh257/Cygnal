import os
from datetime import datetime


def generate_report():
    findings_path = "findings.txt"
    screenshots_dir = "screenshots"
    output_dir = "reports"
    os.makedirs(output_dir, exist_ok=True)

    today = datetime.now().strftime("%Y-%m-%d")
    output_file = os.path.join(output_dir, f"cygnal-report-{today}.md")

    # 🔧 Debug line to confirm function is running
    print("🛠️ Writing to report file...")

    # 🔧 Fix: UTF-8 encoding to support emoji and symbols
    with open(output_file, "w", encoding="utf-8") as report:
        report.write(f"# 🛡️ Cygnal Recon Report\n")
        report.write(f"**Generated on:** {today}\n")
        report.write(f"**Analyst:** Ayush Singh Kshatriya\n")
        report.write("\n---\n\n")

        if os.path.exists(findings_path):
            with open(findings_path, "r", encoding="utf-8") as f:
                findings = f.read()
                report.write(f"## 🔍 Findings Summary\n\n```\n{findings}\n```\n")
        else:
            report.write("⚠️ findings.txt not found.\n")

        report.write("\n---\n")
        report.write("## 📸 Screenshots Used\n\n")

        for img in os.listdir(screenshots_dir):
            if img.endswith(('.png', '.jpg', '.jpeg')):
                img_path = os.path.join(screenshots_dir, img)
                report.write(f"![{img}]({img_path})\n\n")

        report.write("---\n")
        report.write("## ✅ End of Report\n")

if __name__ == "__main__":
    generate_report()