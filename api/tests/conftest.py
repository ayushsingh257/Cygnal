import os

# Set environment variables for testing before importing application modules
os.environ["JWT_SECRET"] = "test_secret_for_cygnal_tests_minimum_32_characters_long"
os.environ["CYGNAL_ADMIN_USERNAME"] = "Ayush Singh"
os.environ["CYGNAL_ADMIN_PASSWORD"] = "Duster@2004"
os.environ["CYGNAL_WEBHOOK_SECRET"] = "test_webhook_secret_for_cygnal_test_suite_2026"

