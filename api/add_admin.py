from auth_utils import add_user

if add_user("Ayush Singh", "Duster@2004", "admin"):
    print("✅ Admin user created successfully.")
else:
    print("❌ Failed to create admin user or user already exists.")
