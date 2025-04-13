#!/bin/zsh

# Prompt for credentials
echo "Enter new admin username:"
read admin_username
echo "Enter new admin password:"
read -s admin_password
echo

# Create or update .env file
echo "ADMIN_USERNAME=$admin_username" > .env
echo "ADMIN_PASSWORD=$admin_password" >> .env

# Make the variables available in the current session
export ADMIN_USERNAME=$admin_username
export ADMIN_PASSWORD=$admin_password

echo "Admin credentials updated successfully!"
echo "To make these credentials permanent, add the following lines to your ~/.zshrc:"
echo "export ADMIN_USERNAME=$admin_username"
echo "export ADMIN_PASSWORD=$admin_password"
echo
echo "Restart your server for the changes to take effect."
