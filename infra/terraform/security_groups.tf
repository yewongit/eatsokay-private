# EC2용 SG: 웹 트래픽(80/443)만 공개, SSH는 기본적으로 닫아두고 SSM Session Manager로 접속한다.
resource "aws_security_group" "ec2" {
  name        = "${var.project_name}-ec2-sg"
  description = "K-Food Lens backend/frontend EC2 SG"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  dynamic "ingress" {
    for_each = var.extra_ssh_cidr != null ? [var.extra_ssh_cidr] : []
    content {
      description = "SSH (temporary, from extra_ssh_cidr)"
      from_port   = 22
      to_port     = 22
      protocol    = "tcp"
      cidr_blocks = [ingress.value]
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-ec2-sg"
  }
}

# RDS용 SG: EC2 SG에서 오는 5432 트래픽만 허용 (외부에는 절대 노출하지 않음).
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds-sg"
  description = "K-Food Lens RDS SG"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description     = "PostgreSQL from EC2"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-rds-sg"
  }
}
