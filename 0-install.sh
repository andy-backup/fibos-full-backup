sudo sudo apt update
sudo sudo apt install -y nodejs curl unzip
node -v
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
aws --version
rm -rf awscliv2.zip aws
curl -s https://fibos.io/download/installer.sh |sh