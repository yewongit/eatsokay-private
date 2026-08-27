resource "random_password" "db_master" {
  length  = 20
  special = true
  # RDS 마스터 비밀번호가 허용하지 않는 문자(예: '/', '@', '"', ' ')는 제외
  override_special = "!#$%^&*()-_=+[]{}<>?"
}

resource "aws_db_instance" "this" {
  identifier     = "${var.project_name}-db"
  engine         = "postgres"
  engine_version = var.db_engine_version

  instance_class    = var.db_instance_class
  allocated_storage = var.db_allocated_storage
  storage_type      = "gp3"

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_master.result
  port     = 5432

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az               = false

  backup_retention_period   = var.db_backup_retention_days
  deletion_protection       = var.db_deletion_protection
  skip_final_snapshot       = !var.db_deletion_protection
  final_snapshot_identifier = var.db_deletion_protection ? "${var.project_name}-db-final" : null

  tags = {
    Name = "${var.project_name}-db"
  }
}
