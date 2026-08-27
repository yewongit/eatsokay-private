# 새 VPC를 만들지 않고 계정의 기본 VPC/서브넷을 그대로 사용한다 (개인/소규모 프로젝트 기준 비용·복잡도 최소화).
# 리전에 기본 VPC가 없다면 `aws ec2 create-default-vpc`로 먼저 만들거나, 이 파일을 커스텀 VPC 리소스로 바꿔야 한다.

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

data "aws_subnet" "default_detail" {
  for_each = toset(data.aws_subnets.default.ids)
  id       = each.value
}

# RDS는 최소 2개의 AZ에 걸친 서브넷 그룹이 필요하다.
resource "aws_db_subnet_group" "this" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = data.aws_subnets.default.ids

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

# EC2는 퍼블릭 IP가 필요하므로 map_public_ip_on_launch가 켜진(기본 VPC는 기본적으로 켜져 있음) 서브넷 중 하나를 사용.
locals {
  public_subnet_id = [
    for s in data.aws_subnet.default_detail : s.id if s.map_public_ip_on_launch
  ][0]
}
