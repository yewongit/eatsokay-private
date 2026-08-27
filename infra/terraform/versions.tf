terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # 여러 명이 같이 쓰거나 상태 파일을 안전하게 보관하려면 S3 백엔드로 바꾸는 걸 권장합니다.
  # backend "s3" {
  #   bucket = "kfood-lens-tfstate"
  #   key    = "prod/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "aws" {
  region = var.aws_region
}
