variable "aws_region" {
  description = "EC2/RDS 등 인프라를 생성할 AWS 리전 (예: 서울 리전은 \"ap-northeast-2\")"
  type        = string
  default     = "us-east-1"
}

variable "bedrock_region" {
  description = "Bedrock 모델 호출에 쓸 리전. BEDROCK_MODEL_ID가 \"us.\" 크로스리전 프로파일이면 미국 리전으로 고정해야 하므로 aws_region과 분리해서 관리한다"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "리소스 이름에 붙는 프로젝트 식별자"
  type        = string
  default     = "kfood-lens"
}

# --- EC2 ---

variable "instance_type" {
  description = "백엔드/프론트를 띄울 EC2 인스턴스 타입"
  type        = string
  default     = "t3.micro"
}

variable "extra_ssh_cidr" {
  description = "SSH(22)를 추가로 열어줄 CIDR (예: \"1.2.3.4/32\"). null이면 SSH를 아예 열지 않고 SSM Session Manager만 사용"
  type        = string
  default     = null
}

# --- RDS ---

variable "db_engine_version" {
  description = "RDS PostgreSQL 엔진 버전 (docker-compose의 postgres:16-alpine과 맞춤). 마이너 버전을 고정하지 않고 major만 지정해 리전별로 지원되는 최신 마이너 버전을 자동으로 쓴다"
  type        = string
  default     = "16"
}

variable "db_instance_class" {
  description = "RDS 인스턴스 클래스"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "RDS 스토리지 크기 (GB)"
  type        = number
  default     = 20
}

variable "db_name" {
  description = "생성할 데이터베이스 이름"
  type        = string
  default     = "kfood_lens"
}

variable "db_username" {
  description = "DB 마스터 사용자명"
  type        = string
  default     = "postgres"
}

variable "db_backup_retention_days" {
  description = "자동 백업 보관 기간 (일)"
  type        = number
  default     = 7
}

variable "db_deletion_protection" {
  description = "삭제 보호 여부 (운영에서는 true 권장, 데모/개발 단계면 false로 두면 terraform destroy가 편함)"
  type        = bool
  default     = false
}

# --- App ---

variable "frontend_origin" {
  description = "CORS를 허용할 프론트엔드 origin (예: https://kfoodlens.com)"
  type        = string
}
