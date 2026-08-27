output "ec2_public_ip" {
  description = "백엔드가 뜰 EC2의 고정 퍼블릭 IP (Elastic IP)"
  value       = aws_eip.app.public_ip
}

output "ec2_instance_id" {
  description = "SSM Session Manager 접속에 사용할 인스턴스 ID"
  value       = aws_instance.app.id
}

output "rds_endpoint" {
  description = "RDS 접속 엔드포인트 (host:port)"
  value       = aws_db_instance.this.endpoint
}

output "rds_address" {
  description = "RDS 접속 host만"
  value       = aws_db_instance.this.address
}

output "db_master_password" {
  description = "RDS 마스터 비밀번호 (terraform output -raw db_master_password 로 조회)"
  value       = random_password.db_master.result
  sensitive   = true
}

# terraform apply 후 `terraform output -raw backend_env_file`로 뽑아서 EC2의 backend/.env로 그대로 사용
output "backend_env_file" {
  description = "EC2에 올릴 backend/.env 내용 미리보기"
  sensitive   = true
  value       = <<-EOT
    NODE_ENV=production
    PORT=3000

    DB_HOST=${aws_db_instance.this.address}
    DB_PORT=5432
    DB_USERNAME=${var.db_username}
    DB_PASSWORD=${random_password.db_master.result}
    DB_DATABASE=${var.db_name}
    DB_SSL=true

    AWS_REGION=${var.bedrock_region}
    AWS_BEARER_TOKEN_BEDROCK=
    BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-5

    CORS_ORIGIN=${var.frontend_origin}
  EOT
}
